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
    const { emoji } = body; // string | null

    // Load message - must belong to this org
    const message = await prisma.message.findFirst({
      where: { id, orgId: activeOrg.orgId },
    });
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    // If platform is FB or IG and has platformMessageId, call Meta API
    if (message.platformMessageId && (message.platform === Platform.FB || message.platform === Platform.IG)) {
      // Find the platform config
      const platformConfig = await prisma.platformConfig.findUnique({
        where: { orgId_platform: { orgId: activeOrg.orgId, platform: message.platform } },
      });

      if (platformConfig && platformConfig.accessToken) {
        // Load contact platformId (the customer's scoped ID)
        const contact = await prisma.contact.findUnique({
          where: { id: message.contactId },
        });

        if (contact) {
          const version = process.env.META_GRAPH_VERSION || 'v19.0';
          let url = '';
          if (message.platform === Platform.FB) {
            url = `https://graph.facebook.com/${version}/me/messages`;
          } else {
            // IG uses /page_id/messages
            url = `https://graph.instagram.com/${version}/${platformConfig.pageId || 'me'}/messages`;
          }

          const payload = {
            recipient: { id: contact.platformId },
            sender_action: emoji ? 'react' : 'unreact',
            payload: emoji
              ? {
                  message_id: message.platformMessageId,
                  reaction: emoji,
                }
              : {
                  message_id: message.platformMessageId,
                },
          };

          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${platformConfig.accessToken}`,
            },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            console.error('Failed to sync reaction with Meta Graph API:', errBody);
          }
        }
      }
    }

    // Update in local DB
    const updated = await prisma.message.update({
      where: { id },
      data: { reaction: emoji || null },
    });

    return NextResponse.json({ success: true, reaction: updated.reaction });
  } catch (error) {
    console.error('React Message Error:', error);
    return NextResponse.json({ error: 'Failed to react to message' }, { status: 500 });
  }
}
