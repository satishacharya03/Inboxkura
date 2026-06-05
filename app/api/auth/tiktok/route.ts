import { NextResponse } from 'next/server';
import { getAuthenticatedUser, getActiveOrg } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const activeOrg = await getActiveOrg(user);
  if (!activeOrg) {
    return NextResponse.redirect(new URL('/create-organization', request.url));
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;

  if (!clientKey) {
    return NextResponse.json(
      {
        error: 'Configuration Missing',
        message: 'TIKTOK_CLIENT_KEY environment variable is not configured. Please add it to your .env file.',
      },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const origin = (process.env.NEXT_PUBLIC_BASE_URL || `${url.protocol}//${url.host}`).replace(/\/$/, '');
  const redirectUri = `${origin}/api/auth/tiktok/callback`;

  // State format: "TIKTOK:orgId"
  const state = `TIKTOK:${activeOrg.orgId}`;

  // Note: Replace with exact TikTok DM scopes you've been approved for, e.g. "im.message.receive,im.message.send"
  const scope = 'user.info.basic,im.message.receive,im.message.send';

  const oauthUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${encodeURIComponent(
    scope
  )}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(oauthUrl);
}
