import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Platform } from '@prisma/client';
import { getAuthenticatedUser, getActiveOrg } from '@/lib/auth';
import { OutboundMessageError, sendOutboundMessage } from '@/lib/outbound';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const activeOrg = await getActiveOrg(user);
    if (!activeOrg) return NextResponse.json({ error: 'No active organization' }, { status: 400 });

    const body = await request.json();
    const replyText = body.text?.trim();
    if (!replyText) return NextResponse.json({ error: 'Reply text is required' }, { status: 400 });

    // Load source message — must belong to same org
    const sourceMessage = body.messageId
      ? await prisma.message.findFirst({
          where: { id: body.messageId, orgId: activeOrg.orgId },
          select: { platform: true, contact: true },
        })
      : null;

    if (body.messageId && !sourceMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const contactId = sourceMessage?.contact.id ?? body.contactId;
    
    if (!contactId) {
      return NextResponse.json({ error: 'Missing contact target' }, { status: 400 });
    }

    const contact = await prisma.contact.findUnique({ 
      where: { id: contactId },
      include: { org: { select: { apiWebhookUrl: true } } }
    });
    if (!contact || contact.orgId !== activeOrg.orgId) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const platform = contact.platform;
    const chatId = contact.platformId;

    // Get platform config scoped to org
    const platformConfig = await prisma.platformConfig.findUnique({
      where:  { orgId_platform: { orgId: activeOrg.orgId, platform: platform as Platform } },
      select: { accessToken: true, pageId: true, connectionId: true },
    });

    const effectiveConnectionId = body.connectionId ?? platformConfig?.connectionId ?? platformConfig?.pageId;

    const result = await sendOutboundMessage({
      platform:    platform as Platform,
      recipientId: chatId,
      text:        replyText,
      config:      platformConfig,
      connectionId: effectiveConnectionId,
      apiWebhookUrl: contact.org?.apiWebhookUrl,
    });

    const platformMessageId = result?.message_id || result?.messages?.[0]?.id || null;

    let savedMessage = null;
    if (platformMessageId) {
      savedMessage = await prisma.message.findFirst({
        where: {
          platform: platform as Platform,
          platformMessageId,
          orgId: activeOrg.orgId,
        },
      });
    }

    if (!savedMessage) {
      // Fallback deduplication check: check if an outbound message with identical text was saved in the last 10 seconds (e.g. if webhook echo arrived first but lacked platformMessageId)
      const windowStart = new Date(Date.now() - 10 * 1050);
      savedMessage = await prisma.message.findFirst({
        where: {
          platform: platform as Platform,
          contactId: contact.id,
          orgId: activeOrg.orgId,
          text: replyText,
          isOutbound: true,
          timestamp: { gte: windowStart },
        },
      });
    }

    if (savedMessage) {
      // Associate with agent user
      savedMessage = await prisma.message.update({
        where: { id: savedMessage.id },
        data: {
          repliedById: user.userId,
        },
      });
      console.log(`✓ Associated existing message ${savedMessage.id} (from echo) with user ${user.userId}`);
    } else {
    // Create new outbound message if not already saved (e.g. from echo)
      savedMessage = await prisma.message.create({
        data: {
          platform:     platform as Platform,
          text:         replyText,
          orgId:        activeOrg.orgId,
          contactId:    contact.id,
          repliedById:  user.userId,
          isOutbound:   true,
          isRead:       true,
          platformMessageId,
        },
      });
    }

    // Publish WebSocket event to sync UI across dashboard clients
    const { publishSocketEvent } = await import('@/lib/socket-publisher');
    await publishSocketEvent({
      orgId: activeOrg.orgId,
      event: 'message:new',
      payload: savedMessage,
    }).catch(console.error);

    // Trigger conversation context update in background
    try {
      const recentMessages = await prisma.message.findMany({
        where: { contactId: contact.id },
        orderBy: { timestamp: 'desc' },
        take: 6,
      });
      recentMessages.reverse();

      const { updateConversationContext } = await import('@/lib/auto-reply');
      updateConversationContext(contact.id, contact.conversationContext, recentMessages).catch(console.error);
    } catch (e) {
      console.error('Failed to trigger context update after manual reply:', e);
    }

    return NextResponse.json({ success: true, message: savedMessage }, { status: 201 });
  } catch (error) {
    console.error('Reply API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send reply';
    const status  = error instanceof OutboundMessageError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
