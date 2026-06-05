import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Platform } from '@prisma/client';
import { getAuthenticatedUser, requireRole } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state') || ''; // Format: "TIKTOK:orgId"

  const error = searchParams.get('error');
  if (!code || error) {
    const reason = searchParams.get('error_description') || error || 'auth_failed';
    return NextResponse.redirect(
      new URL(`/dashboard/integrations?error=${encodeURIComponent(reason)}`, request.url)
    );
  }

  // Parse state
  const [platform, orgId] = state.split(':');
  if (platform !== 'TIKTOK' || !orgId) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=invalid_state', request.url)
    );
  }

  // Verify user is authenticated
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.redirect(
      new URL('/login?error=Session+expired', request.url)
    );
  }

  // Verify role in the organization
  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: user.userId } },
  });
  if (!member) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=not_a_member', request.url)
    );
  }

  const guard = requireRole(member.role, 'ADMIN');
  if (guard) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=insufficient_permissions', request.url)
    );
  }

  const origin = (process.env.NEXT_PUBLIC_BASE_URL || (() => {
    const u = new URL(request.url);
    return `${u.protocol}//${u.host}`;
  })()).replace(/\/$/, '');
  const redirectUri = `${origin}/api/auth/tiktok/callback`;

  const clientKey = process.env.TIKTOK_CLIENT_KEY || '';
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET || '';

  if (!clientKey || !clientSecret) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=missing_tiktok_credentials', request.url)
    );
  }

  try {
    // ── Exchange code for Access Token ───────────────────────────────────────
    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      const errMsg = tokenData.error_description || tokenData.error || 'Token exchange failed';
      throw new Error(errMsg);
    }

    const accessToken = String(tokenData.access_token);
    const openId = String(tokenData.open_id || '');

    let connectedName = 'TikTok Business Account';
    let connectedAvatar = null;
    const connectedEmail = null;

    // ── Fetch User Info from TikTok API v2 ──────────────────────────────────
    try {
      const infoResponse = await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (infoResponse.ok) {
        const infoData = await infoResponse.json();
        const ttUser = infoData.data?.user;
        if (ttUser) {
          connectedName = ttUser.display_name || connectedName;
          connectedAvatar = ttUser.avatar_url || null;
        }
      }
    } catch (infoErr) {
      console.warn('Failed to fetch TikTok user info (non-fatal):', infoErr);
    }

    // ── Save to DB ───────────────────────────────────────────────────────────
    await prisma.platformConfig.upsert({
      where: { orgId_platform: { orgId, platform: Platform.TIKTOK } },
      update: {
        verifyToken: 'tiktok_oauth',
        accessToken,
        pageId: openId,
        connectedName,
        connectedEmail,
        connectedAvatar,
      },
      create: {
        orgId,
        platform: Platform.TIKTOK,
        verifyToken: 'tiktok_oauth',
        accessToken,
        pageId: openId,
        connectedName,
        connectedEmail,
        connectedAvatar,
      },
    });

    return NextResponse.redirect(
      new URL('/dashboard/integrations?success=true&platform=TIKTOK', request.url)
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Error exchanging code';
    console.error('TikTok OAuth Callback Error:', err);
    return NextResponse.redirect(
      new URL(`/dashboard/integrations?error=${encodeURIComponent(errMsg)}&platform=TIKTOK`, request.url)
    );
  }
}
