import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, getActiveOrg } from '@/lib/auth';
import { Platform } from '@prisma/client';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const activeOrg = await getActiveOrg(user);
    if (!activeOrg) return NextResponse.json({ error: 'No active organization' }, { status: 400 });

    const { id } = await params;
    const body = await req.json();
    const { scope } = body; // 'me' | 'everyone'

    // Load message - must belong to this org
    const message = await prisma.message.findFirst({
      where: { id, orgId: activeOrg.orgId },
    });
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    // Handle Unsend for everyone (Real Platform Unsend)
    if (scope === 'everyone') {
      if (!message.isOutbound) {
        return NextResponse.json({ error: 'Cannot unsend inbound messages for everyone' }, { status: 400 });
      }

      if (message.platformMessageId) {
        // Find the platform config
        const platformConfig = await prisma.platformConfig.findUnique({
          where: { orgId_platform: { orgId: activeOrg.orgId, platform: message.platform } },
        });

        if (!platformConfig || !platformConfig.accessToken) {
          return NextResponse.json({ error: 'Platform configuration is missing' }, { status: 400 });
        }

        const version = process.env.META_GRAPH_VERSION || 'v19.0';

        // Call the Facebook/Instagram DELETE endpoint
        if (message.platform === Platform.FB) {
          // Check 10-minute limit
          const elapsed = (Date.now() - new Date(message.timestamp).getTime()) / 60000;
          if (elapsed > 10) {
            return NextResponse.json({ error: 'Unsend window expired on Facebook (10-minute limit)' }, { status: 400 });
          }

          const fbRes = await fetch(
            `https://graph.facebook.com/${version}/${message.platformMessageId}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${platformConfig.accessToken}`,
              },
            }
          );

          if (!fbRes.ok) {
            const errBody = await fbRes.json().catch(() => ({}));
            const errMsg = errBody.error?.message || 'Failed to unsend message on Facebook';
            return NextResponse.json({ error: errMsg }, { status: fbRes.status });
          }
        } else if (message.platform === Platform.IG) {
          const igRes = await fetch(
            `https://graph.instagram.com/${version}/${message.platformMessageId}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${platformConfig.accessToken}`,
              },
            }
          );

          if (!igRes.ok) {
            const errBody = await igRes.json().catch(() => ({}));
            const errMsg = errBody.error?.message || 'Failed to unsend message on Instagram';
            return NextResponse.json({ error: errMsg }, { status: igRes.status });
          }
        } else {
          // WA, TELEGRAM, TIKTOK etc.
          // Gracefully fall back to local-only with a message
          await prisma.message.delete({ where: { id } });
          return NextResponse.json({
            success: true,
            localOnly: true,
            message: `Platform unsend not supported for ${message.platform}. Message was deleted locally.`
          });
        }
      } else {
        // No platformMessageId (e.g. old messages)
        await prisma.message.delete({ where: { id } });
        return NextResponse.json({
          success: true,
          localOnly: true,
          message: 'Message was sent before platform recall was enabled. Only removed from your inbox.'
        });
      }
    }

    // "Unsend for me" or successful platform delete
    await prisma.message.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unsend Message Error:', error);
    return NextResponse.json({ error: 'Failed to unsend message' }, { status: 500 });
  }
}
