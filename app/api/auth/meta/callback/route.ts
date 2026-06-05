import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Platform } from '@prisma/client';
import { getAuthenticatedUser, requireRole } from '@/lib/auth';

const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v19.0';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function subscribeFacebookPage(pageId: string, pageAccessToken: string) {
  const res = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${pageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_echoes&access_token=${pageAccessToken}`,
    { method: 'POST' }
  );
  const data = await res.json();
  if (!res.ok || data.error || data.success === false) {
    throw new Error(data.error?.message || 'Failed to subscribe Facebook Page to webhook');
  }
  return data;
}



// Subscribe an Instagram Professional account to messaging webhooks (messages + echoes)
// Must be called with the long-lived IG user access token and the IG user ID (pageId)
async function subscribeInstagramAccount(igUserId: string, igAccessToken: string) {
  const res = await fetch(
    `https://graph.instagram.com/${META_GRAPH_VERSION}/${igUserId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_optins&access_token=${igAccessToken}`,
    { method: 'POST' }
  );
  const data = await res.json();
  if (!res.ok || data.error || data.success === false) {
    throw new Error(data.error?.message || 'Failed to subscribe Instagram account to webhook');
  }
  console.log(`✓ Subscribed Instagram account ${igUserId} to messaging webhooks`);
  return data;
}

async function getFirstFacebookPage(userAccessToken: string) {
  const res = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/me/accounts?fields=id,name,access_token,picture&access_token=${userAccessToken}`
  );
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || 'Failed to fetch FB pages');

  const pages = data.data || [];
  console.log(`FB pages found: ${pages.length}`, pages.map((p: any) => ({ id: p.id, name: p.name })));

  const page = pages[0];
  if (!page?.id || !page?.access_token) return null;
  return {
    id: String(page.id),
    name: String(page.name || ''),
    accessToken: String(page.access_token),
    avatarUrl: page.picture?.data?.url ? String(page.picture.data.url) : null
  };
}

async function getInstagramBusinessAccount(userAccessToken: string) {
  const res = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/me/accounts?fields=id,name,access_token,picture,instagram_business_account{id,name,username,profile_picture_url}&access_token=${userAccessToken}`
  );
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || 'Failed to fetch FB pages with IG accounts');

  const pages = data.data || [];
  console.log(`FB pages checked for IG: ${pages.length}`);

  for (const page of pages) {
    if (page.instagram_business_account) {
      const igAcc = page.instagram_business_account;
      return {
        pageId: page.id,
        pageAccessToken: page.access_token,
        igId: String(igAcc.id),
        igName: igAcc.name ? `${igAcc.name} (@${igAcc.username})` : `@${igAcc.username}`,
        igAvatarUrl: igAcc.profile_picture_url || null,
      };
    }
  }
  return null;
}

async function subscribeFacebookPageForInstagram(pageId: string, pageAccessToken: string) {
  const res = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${pageId}/subscribed_apps?subscribed_fields=instagram_manage_messages,instagram_manage_comments&access_token=${pageAccessToken}`,
    { method: 'POST' }
  );
  const data = await res.json();
  if (!res.ok || data.error || data.success === false) {
    throw new Error(data.error?.message || 'Failed to subscribe Facebook Page for Instagram webhooks');
  }
  console.log(`✓ Subscribed Facebook Page ${pageId} for Instagram messaging webhooks`);
  return data;
}


type WhatsAppBusinessAccount = { id?: string; phone_numbers?: { data?: Array<{ id?: string }> } };

async function getFirstWhatsAppBusinessAccount(userAccessToken: string) {
  const fields = 'owned_whatsapp_business_accounts{id,phone_numbers{id}},client_whatsapp_business_accounts{id,phone_numbers{id}}';
  const res = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/me/businesses?fields=${encodeURIComponent(fields)}&access_token=${userAccessToken}`
  );
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || 'Failed to fetch WhatsApp accounts');

  for (const biz of (data.data || [])) {
    const accounts = [
      ...(biz.owned_whatsapp_business_accounts?.data || []),
      ...(biz.client_whatsapp_business_accounts?.data || []),
    ] as WhatsAppBusinessAccount[];
    const account = accounts.find(a => a.id);
    if (account?.id) {
      return {
        wabaId:        String(account.id),
        phoneNumberId: account.phone_numbers?.data?.[0]?.id ? String(account.phone_numbers.data[0].id) : null,
      };
    }
  }
  return null;
}

// ── Main Callback Handler ────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get('code');
  const state = searchParams.get('state') || ''; // format: "FB:orgId"

  const errorCode = searchParams.get('error_code');
  if (!code || errorCode) {
    const reason = searchParams.get('error_message') || 'auth_failed';
    return NextResponse.redirect(new URL(`/dashboard/integrations?error=${encodeURIComponent(reason)}`, request.url));
  }

  // Parse platform and orgId from state
  const [platform, orgId] = state.split(':');

  if (!platform || !orgId || !['FB', 'IG', 'WA'].includes(platform)) {
    return NextResponse.redirect(new URL('/dashboard/integrations?error=invalid_state', request.url));
  }

  // Verify user is logged in and is ADMIN+ of this org
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login?error=Session+expired', request.url));
  }

  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: user.userId } },
  });
  if (!member) {
    return NextResponse.redirect(new URL('/dashboard/integrations?error=not_a_member', request.url));
  }
  const guard = requireRole(member.role, 'ADMIN');
  if (guard) {
    return NextResponse.redirect(new URL('/dashboard/integrations?error=insufficient_permissions', request.url));
  }

  const origin = (process.env.NEXT_PUBLIC_BASE_URL || (() => {
    const u = new URL(request.url);
    return `${u.protocol}//${u.host}`;
  })()).replace(/\/$/, '');
  const redirectUri = `${origin}/api/auth/meta/callback`;

  const fbAppId     = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_APP_ID || '';
  const fbAppSecret = process.env.FACEBOOK_APP_SECRET || '';

  if (platform !== 'IG' && (!fbAppId || !fbAppSecret)) {
    return NextResponse.redirect(new URL(`/dashboard/integrations?error=missing_credentials`, request.url));
  }

  try {
    let accessToken: string | null = null;
    let pageId: string | null = null;
    let tokenError: string | null = null;
    let fbPageSubscription: { pageId: string; accessToken: string } | null = null;
    let igPageSubscription: { pageId: string; accessToken: string } | null = null;
    let waSubscription:     { wabaId: string; accessToken: string } | null = null;

    let connectedName:    string | null = null;
    let connectedEmail:   string | null = null;
    let connectedAvatar:  string | null = null;

    // ── Exchange code for token ───────────────────────────────────────────────
    if (platform === 'FB' || platform === 'IG' || platform === 'WA') {
      const res  = await fetch(
        `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${fbAppSecret}&code=${code}`
      );
      const data = await res.json();

      if (data.access_token) {
        const userToken = String(data.access_token);
        accessToken = userToken;

        // Verify required permissions are granted
        try {
          console.log(`[Meta OAuth Callback] Validating permissions for ${platform}...`);
          const permRes = await fetch(
            `https://graph.facebook.com/${META_GRAPH_VERSION}/me/permissions?access_token=${userToken}`
          );
          if (permRes.ok) {
            const permData = await permRes.json();
            const grantedPermissions = (permData.data || [])
              .filter((p: any) => p.status === 'granted')
              .map((p: any) => p.permission);

            console.log(`[Meta OAuth Callback] Granted permissions:`, grantedPermissions);

            const required = platform === 'FB'
              ? ['pages_messaging', 'pages_show_list']
              : platform === 'IG'
              ? ['instagram_basic', 'instagram_manage_messages', 'pages_show_list']
              : ['whatsapp_business_messaging'];

            const missing = required.filter(p => !grantedPermissions.includes(p));
            if (missing.length > 0) {
              console.error(`[Meta OAuth Callback] Missing permissions for ${platform}:`, missing);
              return NextResponse.redirect(
                new URL(`/dashboard/integrations?error=missing_permissions&platform=${platform}&missing=${encodeURIComponent(missing.join(','))}`, request.url)
              );
            }
          } else {
            const errText = await permRes.text();
            console.warn(`[Meta OAuth Callback] Failed to fetch permissions. Status: ${permRes.status}. Response: ${errText}`);
          }
        } catch (permErr) {
          console.error('[Meta OAuth Callback] Error checking permissions:', permErr);
        }

        if (platform === 'FB') {
          const page = await getFirstFacebookPage(userToken);
          if (page) {
            accessToken = page.accessToken;
            pageId      = page.id;
            connectedName = page.name;
            connectedAvatar = page.avatarUrl;

            // Also fetch the FB Administrator's email who authorized it
            try {
              const userRes = await fetch(
                `https://graph.facebook.com/${META_GRAPH_VERSION}/me?fields=name,email&access_token=${userToken}`
              );
              if (userRes.ok) {
                const userData = await userRes.json();
                connectedEmail = userData.email || null;
                console.log(`FB Admin user email: ${connectedEmail}`);
              }
            } catch (err) {
              console.warn('Failed to fetch FB admin email (non-fatal):', err);
            }

            fbPageSubscription = { pageId: page.id, accessToken: page.accessToken };
          } else {
            throw new Error('No Facebook Pages found. Make sure you grant access to your Page during the login flow.');
          }
        } else if (platform === 'IG') {
          const igAcc = await getInstagramBusinessAccount(userToken);
          if (igAcc) {
            accessToken = igAcc.pageAccessToken;
            pageId      = igAcc.igId;
            connectedName = igAcc.igName;
            connectedAvatar = igAcc.igAvatarUrl;
            igPageSubscription = { pageId: igAcc.pageId, accessToken: igAcc.pageAccessToken };
          } else {
            throw new Error('No linked Instagram Business Accounts found on your Facebook Pages. Make sure your Instagram account is a Professional account and linked to a Facebook Page.');
          }
        } else if (platform === 'WA') {
          const waba = await getFirstWhatsAppBusinessAccount(userToken);
          if (!waba?.phoneNumberId) throw new Error('No WhatsApp phone number found');
          pageId       = waba.phoneNumberId;
          waSubscription = { wabaId: waba.wabaId, accessToken: userToken };
        }
      } else {
        tokenError = data.error?.message || JSON.stringify(data);
      }
    }

    // ── Save to DB (org-scoped) ───────────────────────────────────────────────
    const verifyToken = process.env.META_VERIFY_TOKEN || `verify_${Math.random().toString(36).substring(2)}`;
    console.log(`Saving PlatformConfig: org=${orgId}, platform=${platform}, pageId=${pageId}, hasToken=${!!accessToken}`);

    await prisma.platformConfig.upsert({
      where:  { orgId_platform: { orgId, platform: platform as Platform } },
      update: {
        verifyToken,
        ...(accessToken ? { accessToken } : {}),
        ...(pageId      ? { pageId }      : {}),
        connectedName,
        connectedEmail,
        connectedAvatar,
      },
      create: {
        orgId,
        platform: platform as Platform,
        verifyToken,
        accessToken,
        pageId,
        connectedName,
        connectedEmail,
        connectedAvatar,
      },
    });

    // ── Subscribe webhooks (non-fatal) ────────────────────────────────────────
    try {
      if (fbPageSubscription) await subscribeFacebookPage(fbPageSubscription.pageId, fbPageSubscription.accessToken);
      if (igPageSubscription) await subscribeFacebookPageForInstagram(igPageSubscription.pageId, igPageSubscription.accessToken);
      if (waSubscription) {
        await fetch(
          `https://graph.facebook.com/${META_GRAPH_VERSION}/${waSubscription.wabaId}/subscribed_apps`,
          { method: 'POST', headers: { Authorization: `Bearer ${waSubscription.accessToken}` } }
        );
      }
    } catch (subErr) {
      console.warn('Webhook subscription warning (non-fatal):', subErr instanceof Error ? subErr.message : subErr);
    }

     if (accessToken) {
      return NextResponse.redirect(new URL(`/dashboard/integrations?success=true&platform=${platform}`, request.url));
    } else {
      return NextResponse.redirect(new URL(`/dashboard/integrations?error=no_token&platform=${platform}&message=${encodeURIComponent(tokenError || 'No token')}`, request.url));
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error occurred';
    return NextResponse.redirect(new URL(`/dashboard/integrations?error=${encodeURIComponent(message)}`, request.url));
  }
}
