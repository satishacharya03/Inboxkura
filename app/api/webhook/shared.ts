import { prisma } from '@/lib/prisma';
import { Platform } from '@prisma/client';
import { triggerAutoReply } from '@/lib/auto-reply';

export type JsonObject = Record<string, unknown>;

// ─── Meta Graph API version ───────────────────────────────────────────────────
const V = () => process.env.META_GRAPH_VERSION || 'v22.0';

// ─── FACEBOOK MESSENGER profile fetch ────────────────────────────────────────
// Uses ONLY the Facebook Page Access Token.
// Fetches name + profile_pic for a Facebook PSID (Page-Scoped User ID).
// Ref: https://developers.facebook.com/docs/messenger-platform/identity/user-profile
export async function fetchFBProfile(
  psid: string,
  fbPageToken: string
): Promise<{ name: string | null; profilePic: string | null }> {
  try {
    const url = `https://graph.facebook.com/${V()}/${psid}?fields=name,profile_pic,picture&access_token=${fbPageToken}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const pic = data.profile_pic || data.picture?.data?.url || null;
      if (data && (data.name || pic)) {
        return {
          name: data.name || null,
          profilePic: pic
        };
      }
    }
  } catch (e) {
    console.warn(`[FB Profile] fetch failed for PSID ${psid}:`, e);
  }
  return { name: null, profilePic: null };
}

// ─── INSTAGRAM profile fetch ─────────────────────────────────────────────────
// Uses ONLY the Instagram Page Access Token (stored in IG platformConfig).
// Fetches name + profile_pic for an Instagram IGSID (Instagram-Scoped User ID).
// Ref: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started
// Ref: https://developers.facebook.com/docs/instagram-platform/reference/ig-user
export async function fetchIGProfile(
  igsid: string,
  igPageToken: string,
  fbPageToken?: string
): Promise<{ name: string | null; profilePic: string | null }> {
  try {
    const tokensToTry = [igPageToken, fbPageToken].filter(Boolean) as string[];

    for (const token of tokensToTry) {
      // 1. Try the New Independent Instagram API
      try {
        const igUrl = `https://graph.instagram.com/${V()}/${igsid}?fields=name,username,profile_pic&access_token=${token}`;
        const igRes = await fetch(igUrl);
        if (igRes.ok) {
          const igData = await igRes.json();
          if (igData && (igData.name || igData.username || igData.profile_pic)) {
            return {
              name: igData.name || igData.username || null,
              profilePic: igData.profile_pic || null
            };
          }
        }
      } catch (e) {
        console.warn(`[IG Profile] graph.instagram.com fetch failed for token starting ${token.substring(0, 5)}:`, e);
      }

      // 2. Fallback to Legacy FB-linked Graph API
      try {
        const fbUrl = `https://graph.facebook.com/${V()}/${igsid}?fields=name,profile_pic&access_token=${token}`;
        const fbRes = await fetch(fbUrl);
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          if (fbData && (fbData.name || fbData.profile_pic)) {
            return {
              name: fbData.name || null,
              profilePic: fbData.profile_pic || null
            };
          }
        }
      } catch (e) {
        console.warn(`[IG Profile] graph.facebook.com fetch failed for token starting ${token.substring(0, 5)}:`, e);
      }
    }
  } catch (e) {
    console.warn(`[IG Profile] fetch failed for IGSID ${igsid}:`, e);
  }
  return { name: null, profilePic: null };
}

// ─── Legacy exports for backwards compatibility ───────────────────────────────
// (used by contacts/route.ts background refresh)
export const fetchMetaProfile = fetchFBProfile;
export async function fetchInstagramProfile(igsid: string, igToken: string) {
  return fetchIGProfile(igsid, igToken);
}

export async function saveMessageToOrg(
  platform: Platform,
  senderId: string,
  text: string,
  timestamp: number,
  pageId: string,
  connectionId?: string,
  isOutbound: boolean = false,
  platformMessageId?: string,
  senderName?: string,
  senderAvatar?: string,
  imageUrl?: string,
  audioUrl?: string,
  videoUrl?: string,
  waMediaId?: string,
) {
  try {
    // Primary lookup: exact platform + pageId → find org
    let config = await prisma.platformConfig.findFirst({
      where: { platform, pageId },
    });

    if (!config) {
      const allConfigs = await prisma.platformConfig.findMany({
        where: { platform },
        select: { id: true, orgId: true, pageId: true },
      });

      console.log(
        `✗ No config for ${platform} pageId="${pageId}". ` +
        `Found ${allConfigs.length} config(s): ` +
        JSON.stringify(allConfigs.map(c => ({ orgId: c.orgId.slice(-6), pageId: c.pageId })))
      );

      // Fallback: single config with null pageId → auto-fix
      if (allConfigs.length === 1 && allConfigs[0].pageId === null) {
        config = await prisma.platformConfig.findUnique({ where: { id: allConfigs[0].id } });
        console.log(`⚠️  Using fallback config for org ...${allConfigs[0].orgId.slice(-6)}`);
      }
    }

    if (!config?.orgId) {
      console.log(`✗ Orphaned message — no org found for ${platform} pageId="${pageId}"`);
      return;
    }

    // Auto-fix missing pageId
    if (pageId && !config.pageId) {
      await prisma.platformConfig.update({ where: { id: config.id }, data: { pageId } });
      console.log(`🔧 Auto-fixed pageId="${pageId}" for org ...${config.orgId.slice(-6)}`);
    }

    // ── Upsert Contact ─────────────────────────────────────────────────────────
    let contact = await prisma.contact.findUnique({
      where: { orgId_platform_platformId: { orgId: config.orgId, platform, platformId: senderId } },
    });

    let profileName   = senderName   || null;
    let profileAvatar = senderAvatar || null;

    // ── Profile Fetch: FB and IG are FULLY INDEPENDENT ────────────────────────
    // • FB contacts → use ONLY the FB Page Access Token (config.accessToken for FB)
    // • IG contacts → use ONLY the IG Page Access Token (config.accessToken for IG)
    // • No cross-platform token sharing
    //
    // When to fetch:
    //   1. New contact (first ever message) → always fetch
    //   2. Missing name in DB               → fetch to fill gaps
    //   3. Profile older than 12 hours      → re-fetch to pick up changes
    const isMeta = platform === 'FB' || platform === 'IG';
    const hoursSinceUpdate = contact
      ? (Date.now() - new Date(contact.updatedAt).getTime()) / (1000 * 60 * 60)
      : Infinity;

    const shouldFetch = isMeta && !!config.accessToken && (
      !contact ||                          // new contact
      !contact.name ||                     // missing name
      hoursSinceUpdate > 12                // stale profile
    );

    if (shouldFetch) {
      try {
        let fetched: { name: string | null; profilePic: string | null };

        if (platform === 'FB') {
          fetched = await fetchFBProfile(senderId, config.accessToken!);
        } else {
          // Meta API quirk: Instagram Scoped IDs often require the FB Page Token to retrieve profile data.
          const fbConfig = await prisma.platformConfig.findFirst({
            where: { orgId: config.orgId, platform: 'FB' },
          });
          fetched = await fetchIGProfile(senderId, config.accessToken!, fbConfig?.accessToken || undefined);
        }

        if (fetched.name) profileName = fetched.name;
        if (fetched.profilePic) profileAvatar = fetched.profilePic;
      } catch (err) {
        console.warn(`[Profile] Failed to fetch ${platform} profile for ${senderId}:`, err);
      }
    }

    // ── Create or update contact ───────────────────────────────────────────────
    // We save avatarUrl in DB for all platforms as a fallback/cache
    const finalAvatarUrl = profileAvatar;

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          orgId:      config.orgId,
          platform,
          platformId: senderId,
          name:       profileName,
          avatarUrl:  finalAvatarUrl,
        }
      });
      console.log(`✓ New ${platform} contact ${senderId}: name="${profileName}"`);
    } else {
      const existing      = contact;
      const updatedName   = profileName || existing.name || null;
      const updatedAvatar = finalAvatarUrl || existing.avatarUrl || null;

      if (updatedName !== existing.name || updatedAvatar !== existing.avatarUrl) {
        contact = await prisma.contact.update({
          where: { id: existing.id },
          data:  { name: updatedName, avatarUrl: updatedAvatar }
        });
        if (updatedName !== existing.name) console.log(`[Profile] ${platform} ${senderId} name: "${existing.name}" → "${updatedName}"`);
      }
    }

    const resolvedContact = contact!;

    // ── Deduplicate by platformMessageId ──────────────────────────────────────
    if (platformMessageId) {
      const dup = await prisma.message.findFirst({
        where: { platform, platformMessageId, orgId: config.orgId },
      });
      if (dup) {
        console.log(`✓ Duplicate skipped: ${platform} mid=${platformMessageId}`);
        return;
      }
    }

    // ── Deduplicate by text+timestamp window (when no message ID) ─────────────
    if (!platformMessageId) {
      const ts = new Date(timestamp);
      const dup = await prisma.message.findFirst({
        where: {
          platform,
          contactId:  resolvedContact.id,
          orgId:      config.orgId,
          text,
          isOutbound,
          timestamp:  { gte: new Date(ts.getTime() - 30_000), lte: new Date(ts.getTime() + 30_000) },
        },
      });
      if (dup) {
        console.log(`✓ Duplicate skipped by timestamp window`);
        return;
      }
    }

    // ── Resolve WhatsApp media URLs ────────────────────────────────────────────
    let finalImageUrl = imageUrl;
    let finalAudioUrl = audioUrl;
    let finalVideoUrl = videoUrl;

    if (platform === 'WA' && waMediaId && config.accessToken) {
      try {
        const mediaRes = await fetch(
          `https://graph.facebook.com/${V()}/${waMediaId}?access_token=${config.accessToken}`
        );
        if (mediaRes.ok) {
          const mediaData = await mediaRes.json();
          if (mediaData.url) {
            const mime = (mediaData.mime_type || '').toLowerCase();
            if      (mime.startsWith('image/'))                              finalImageUrl = mediaData.url;
            else if (mime.startsWith('audio/') || mime.includes('ogg'))     finalAudioUrl = mediaData.url;
            else if (mime.startsWith('video/'))                              finalVideoUrl = mediaData.url;
            else                                                             finalImageUrl = mediaData.url;
          }
        }
      } catch (err) {
        console.error(`[WA Media] Failed to resolve media ID ${waMediaId}:`, err);
      }
    }

    // ── Save message ───────────────────────────────────────────────────────────
    const savedMsg = await prisma.message.create({
      data: {
        platform,
        text,
        imageUrl:          finalImageUrl || null,
        audioUrl:          finalAudioUrl || null,
        videoUrl:          finalVideoUrl || null,
        timestamp:         new Date(timestamp),
        orgId:             config.orgId,
        contactId:         resolvedContact.id,
        isOutbound,
        isRead:            isOutbound,
        platformMessageId: platformMessageId || null,
      },
    });
    console.log(`✓ Saved ${platform} msg from ${senderId} → org ...${config.orgId.slice(-6)}`);

    // ── Publish socket event for real-time dashboard sync ─────────────────────
    try {
      const { publishSocketEvent } = await import('@/lib/socket-publisher');
      await publishSocketEvent({
        orgId: config.orgId,
        event: 'message:new',
        payload: savedMsg,
      });
    } catch (err) {
      console.error(`[SocketPublish] Failed to publish event for msg ${savedMsg.id}:`, err);
    }

    // ── Trigger auto-reply for inbound messages ────────────────────────────────
    if (!isOutbound) {
      await triggerAutoReply(savedMsg.id).catch(err => {
        console.error(`[AutoReply] Failed for msg ${savedMsg.id}:`, err);
      });
    }
  } catch (err) {
    console.error(`✗ saveMessageToOrg failed:`, err);
  }
}

export async function verifyMetaWebhook(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token) {
    const envToken = process.env.META_VERIFY_TOKEN;
    if (token === envToken) return new Response(challenge ?? '', { status: 200 });

    const config = await prisma.platformConfig.findFirst({ where: { verifyToken: token } });
    if (config) return new Response(challenge ?? '', { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

import { createHmac, timingSafeEqual } from 'crypto';

export function verifyMetaSignature(request: Request, bodyText: string, secret: string): boolean {
  const signature = request.headers.get('x-hub-signature-256');
  if (!signature) return false;

  const expected = 'sha256=' + createHmac('sha256', secret).update(bodyText).digest('hex');
  const sigBuf = Buffer.from(signature);
  try {
    const expBuf = Buffer.from(expected);
    if (sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf)) return true;
  } catch {}
  return false;
}
