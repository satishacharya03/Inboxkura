import { NextResponse } from 'next/server';
import { getAuthenticatedUser, getActiveOrg } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const activeOrg = await getActiveOrg(user);
  if (!activeOrg) return NextResponse.redirect(new URL('/create-organization', request.url));

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform') || 'FB';

  const fbClientId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_APP_ID;

  if (!fbClientId) {
    return NextResponse.json({
      error: 'Configuration Missing',
      message: 'NEXT_PUBLIC_FACEBOOK_APP_ID is not set.'
    }, { status: 500 });
  }

  const url = new URL(request.url);
  const origin = (process.env.NEXT_PUBLIC_BASE_URL || `${url.protocol}//${url.host}`).replace(/\/$/, '');
  const redirectUri = `${origin}/api/auth/meta/callback`;

  // Encode orgId in state: "FB:orgId", "IG:orgId", etc.
  const state = `${platform}:${activeOrg.orgId}`;

  let oauthUrl = '';
  if (platform === 'IG') {
    // We connect Instagram Business Messaging via Facebook Login for Business flow
    // which grants us the linked Facebook Page Access Token necessary to retrieve user profiles.
    if (!fbClientId) {
      return NextResponse.json({
        error: 'Configuration Missing',
        message: 'NEXT_PUBLIC_FACEBOOK_APP_ID is not set.'
      }, { status: 500 });
    }
    const scope = 'business_management,pages_show_list,instagram_basic,instagram_manage_messages,pages_read_engagement,pages_manage_metadata,public_profile';
    oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${fbClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scope)}&auth_type=rerequest`;
  } else {
    let scope = '';
    if (platform === 'FB') scope = 'business_management,pages_show_list,pages_messaging,pages_read_engagement,pages_manage_metadata,public_profile';
    else if (platform === 'WA') scope = 'business_management,whatsapp_business_management,whatsapp_business_messaging';
    oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${fbClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scope)}&auth_type=rerequest`;
  }

  return NextResponse.redirect(oauthUrl);
}
