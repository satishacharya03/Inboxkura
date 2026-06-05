import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrg } from '@/lib/auth';
import { Platform } from '@prisma/client';

const V = () => process.env.META_GRAPH_VERSION || 'v22.0';

export async function GET(request: Request) {
  try {
    const activeOrg = await getActiveOrg();
    if (!activeOrg) return new Response('Unauthorized', { status: 401 });

    const { searchParams } = new URL(request.url);
    const platform   = searchParams.get('platform') as Platform;
    const platformId = searchParams.get('platformId');

    if (!platform || !platformId) return new Response('Missing params', { status: 400 });

    // Fetch the contact from database to get the fallback avatarUrl
    const contact = await prisma.contact.findUnique({
      where: {
        orgId_platform_platformId: {
          orgId: activeOrg.orgId,
          platform,
          platformId,
        },
      },
      select: { avatarUrl: true },
    });

    const fallbackUrl = contact?.avatarUrl || null;

    // ── FB: use Facebook Page Access Token only ───────────────────────────────
    if (platform === 'FB') {
      const fbConfig = await prisma.platformConfig.findUnique({
        where: { orgId_platform: { orgId: activeOrg.orgId, platform: 'FB' } },
        select: { accessToken: true },
      });

      if (fbConfig?.accessToken) {
        try {
          const res = await fetch(`https://graph.facebook.com/${V()}/${platformId}?fields=picture&access_token=${fbConfig.accessToken}`);
          if (res.ok) {
            const data = await res.json();
            const picUrl = data?.picture?.data?.url;
            if (picUrl) {
              // Update database in background if URL has changed
              if (picUrl !== fallbackUrl) {
                prisma.contact.update({
                  where: { orgId_platform_platformId: { orgId: activeOrg.orgId, platform, platformId } },
                  data: { avatarUrl: picUrl },
                }).catch(err => console.error('[Avatar] Failed to update FB avatar in DB:', err));
              }

              const response = NextResponse.redirect(picUrl);
              response.headers.set('Cache-Control', 'public, max-age=21600, stale-while-revalidate=86400');
              return response;
            }
          } else {
            const errData = await res.json().catch(() => ({}));
            console.warn(`[Avatar/FB] fetch failed for ${platformId}:`, errData);
          }
        } catch (e) {
          console.warn(`[Avatar/FB] fetch error for ${platformId}:`, e);
        }
      }

      if (fallbackUrl) {
        return NextResponse.redirect(fallbackUrl);
      }
      return new Response('No FB avatar', { status: 404 });
    }

    // ── IG: try IG token, fall back to FB token (Meta API quirk) ──────────────
    if (platform === 'IG') {
      const igConfig = await prisma.platformConfig.findUnique({
        where: { orgId_platform: { orgId: activeOrg.orgId, platform: 'IG' } },
        select: { accessToken: true },
      });
      const fbConfig = await prisma.platformConfig.findUnique({
        where: { orgId_platform: { orgId: activeOrg.orgId, platform: 'FB' } },
        select: { accessToken: true },
      });

      const tokensToTry = [igConfig?.accessToken, fbConfig?.accessToken].filter(Boolean) as string[];

      for (const token of tokensToTry) {
        // 1. Try the New Independent Instagram API
        try {
          const igRes = await fetch(`https://graph.instagram.com/${V()}/${platformId}?fields=profile_pic&access_token=${token}`);
          if (igRes.ok) {
            const igData = await igRes.json();
            if (igData && igData.profile_pic) {
              if (igData.profile_pic !== fallbackUrl) {
                prisma.contact.update({
                  where: { orgId_platform_platformId: { orgId: activeOrg.orgId, platform, platformId } },
                  data: { avatarUrl: igData.profile_pic },
                }).catch(err => console.error('[Avatar] Failed to update IG avatar in DB:', err));
              }

              const response = NextResponse.redirect(igData.profile_pic);
              response.headers.set('Cache-Control', 'public, max-age=21600, stale-while-revalidate=86400');
              return response;
            }
          }
        } catch (e) {
          console.warn(`[Avatar/IG] graph.instagram.com fetch failed for ${platformId}:`, e);
        }

        // 2. Fallback to Legacy FB-linked Graph API
        try {
          const fbRes = await fetch(`https://graph.facebook.com/${V()}/${platformId}?fields=profile_pic&access_token=${token}`);
          if (fbRes.ok) {
            const fbData = await fbRes.json();
            if (fbData && fbData.profile_pic) {
              if (fbData.profile_pic !== fallbackUrl) {
                prisma.contact.update({
                  where: { orgId_platform_platformId: { orgId: activeOrg.orgId, platform, platformId } },
                  data: { avatarUrl: fbData.profile_pic },
                }).catch(err => console.error('[Avatar] Failed to update IG avatar in DB:', err));
              }

              const response = NextResponse.redirect(fbData.profile_pic);
              response.headers.set('Cache-Control', 'public, max-age=21600, stale-while-revalidate=86400');
              return response;
            }
          }
        } catch (e) {
          console.warn(`[Avatar/IG] graph.facebook.com fetch failed for ${platformId}:`, e);
        }
      }

      if (fallbackUrl) {
        return NextResponse.redirect(fallbackUrl);
      }
      return new Response('No IG avatar', { status: 404 });
    }

    return new Response('No avatar found', { status: 404 });
  } catch (error) {
    console.error('[Avatar] Error:', error);
    return new Response('Internal error', { status: 500 });
  }
}
