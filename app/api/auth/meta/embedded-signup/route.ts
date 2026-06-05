import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, requireRole } from '@/lib/auth';

const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v19.0';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const body = await request.json();
    const { code, event_data, orgId } = body;

    if (!orgId || !code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const member = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: user.userId } },
    });
    if (!member) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }
    const guard = requireRole(member.role, 'ADMIN');
    if (guard) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_APP_ID || '';
    const fbAppSecret = process.env.FACEBOOK_APP_SECRET || '';

    if (!fbAppId || !fbAppSecret) {
      return NextResponse.json({ error: 'Missing Meta credentials' }, { status: 500 });
    }

    const origin = (process.env.NEXT_PUBLIC_BASE_URL || (() => {
      const u = new URL(request.url);
      return `${u.protocol}//${u.host}`;
    })()).replace(/\/$/, '');
    // For FB.login, redirect_uri is usually not required for code exchange, but if it is, it might need to be empty or current origin.
    // However, Meta Graph API oauth/access_token expects redirect_uri. If using FB JS SDK, sometimes we can just use an empty redirect_uri or origin.
    const redirectUri = `${origin}/`;

    // 1. Exchange code for access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?client_id=${fbAppId}&client_secret=${fbAppSecret}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      // Sometimes if redirect_uri mismatch, we can try without it or with empty string
      const fallbackRes = await fetch(
        `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?client_id=${fbAppId}&client_secret=${fbAppSecret}&code=${code}&redirect_uri=`
      );
      const fallbackData = await fallbackRes.json();
      if (!fallbackRes.ok || fallbackData.error) {
         throw new Error(fallbackData.error?.message || tokenData.error?.message || 'Failed to exchange token');
      }
      tokenData.access_token = fallbackData.access_token;
    }

    const accessToken = tokenData.access_token;

    let wabaId = event_data?.waba_id;
    let phoneNumberId = event_data?.phone_number_id;
    let connectedName = 'WhatsApp Business';

    // 2. Fallback to me/businesses if WABA ID is missing (just like standard OAuth)
    if (!wabaId || !phoneNumberId) {
      const fields = 'owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number}},client_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number}}';
      const res = await fetch(
        `https://graph.facebook.com/${META_GRAPH_VERSION}/me/businesses?fields=${encodeURIComponent(fields)}&access_token=${accessToken}`
      );
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error?.message || 'Failed to fetch WhatsApp accounts');

      for (const biz of (data.data || [])) {
        const accounts = [
          ...(biz.owned_whatsapp_business_accounts?.data || []),
          ...(biz.client_whatsapp_business_accounts?.data || []),
        ];
        const account = accounts.find((a: any) => a.id);
        if (account?.id) {
          wabaId = String(account.id);
          connectedName = account.name || 'WhatsApp Business';
          if (account.phone_numbers?.data?.[0]?.id) {
            phoneNumberId = String(account.phone_numbers.data[0].id);
          }
          break;
        }
      }
    }

    if (!phoneNumberId) {
      throw new Error('No WhatsApp phone number found in account.');
    }

    // 3. Save PlatformConfig
    const verifyToken = process.env.META_VERIFY_TOKEN || `verify_${Math.random().toString(36).substring(2)}`;
    await prisma.platformConfig.upsert({
      where: { orgId_platform: { orgId, platform: 'WA' } },
      update: {
        verifyToken,
        accessToken,
        pageId: phoneNumberId,
        connectedName,
      },
      create: {
        orgId,
        platform: 'WA',
        verifyToken,
        accessToken,
        pageId: phoneNumberId,
        connectedName,
      },
    });

    // 4. Subscribe WABA to webhooks
    if (wabaId) {
      try {
        await fetch(
          `https://graph.facebook.com/${META_GRAPH_VERSION}/${wabaId}/subscribed_apps`,
          { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } }
        );
      } catch (err) {
        console.warn('WABA webhook subscription warning:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Embedded signup error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
