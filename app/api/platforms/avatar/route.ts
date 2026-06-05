import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrg } from '@/lib/auth';

const V = () => process.env.META_GRAPH_VERSION || 'v22.0';

/**
 * GET /api/platforms/avatar?platform=FB  → Fetches the Facebook Page's profile picture
 * GET /api/platforms/avatar?platform=IG  → Fetches the Instagram Business Account's profile picture
 *
 * FB: Queries the Facebook Page picture endpoint using the FB Page Access Token.
 * IG: Queries the Instagram Business Account profile picture using the IG Access Token.
 *
 * These are fully independent — no cross-platform token usage.
 */
export async function GET(request: Request) {
  try {
    const activeOrg = await getActiveOrg();
    if (!activeOrg) return new Response('Unauthorized', { status: 401 });

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    // ── FACEBOOK: Page picture using FB Page token ────────────────────────────
    if (platform === 'FB') {
      const fbConfig = await prisma.platformConfig.findUnique({
        where: { orgId_platform: { orgId: activeOrg.orgId, platform: 'FB' } },
      });

      if (!fbConfig?.accessToken || !fbConfig.pageId) {
        return new Response('No FB config', { status: 404 });
      }

      // Fetch the Facebook Page's profile picture (redirect=false returns JSON with URL)
      const res  = await fetch(`https://graph.facebook.com/${V()}/${fbConfig.pageId}/picture?type=large&redirect=false&access_token=${fbConfig.accessToken}`);
      const data = await res.json();

      if (res.ok && data?.data?.url) {
        const pictureUrl = data.data.url;
        if (fbConfig.connectedAvatar !== pictureUrl) {
          prisma.platformConfig.update({ where: { id: fbConfig.id }, data: { connectedAvatar: pictureUrl } }).catch(() => {});
        }
        return NextResponse.redirect(pictureUrl);
      }

      // Fallback to stored avatar
      if (fbConfig.connectedAvatar) return NextResponse.redirect(fbConfig.connectedAvatar);
      return new Response('No FB avatar', { status: 404 });
    }

    // ── INSTAGRAM: IG Business Account profile picture using IG token ─────────
    if (platform === 'IG') {
      const igConfig = await prisma.platformConfig.findUnique({
        where: { orgId_platform: { orgId: activeOrg.orgId, platform: 'IG' } },
      });

      if (!igConfig?.accessToken || !igConfig.pageId) {
        return new Response('No IG config', { status: 404 });
      }

      // Fetch IG Business Account profile — pageId here is the IG User ID
      const res  = await fetch(`https://graph.facebook.com/${V()}/${igConfig.pageId}?fields=profile_picture_url,username,name&access_token=${igConfig.accessToken}`);
      const data = await res.json();

      if (res.ok && data?.profile_picture_url) {
        const pictureUrl = data.profile_picture_url;
        if (igConfig.connectedAvatar !== pictureUrl) {
          prisma.platformConfig.update({ where: { id: igConfig.id }, data: { connectedAvatar: pictureUrl } }).catch(() => {});
        }
        return NextResponse.redirect(pictureUrl);
      }

      if (data?.error) console.warn(`[PlatformAvatar/IG] ${igConfig.pageId}: ${data.error.message}`);

      // Fallback to stored avatar
      if (igConfig.connectedAvatar) return NextResponse.redirect(igConfig.connectedAvatar);
      return new Response('No IG avatar', { status: 404 });
    }

    return new Response('Unsupported platform', { status: 400 });
  } catch (error) {
    console.error('[PlatformAvatar] Error:', error);
    return new Response('Internal error', { status: 500 });
  }
}
