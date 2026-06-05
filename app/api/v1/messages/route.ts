import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Platform } from '@prisma/client';

export async function POST(request: Request) {
  try {
    // 1. Authenticate via Bearer Token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid Bearer token' }, { status: 401 });
    }

    const apiKey = authHeader.split(' ')[1];

    const org = await prisma.organization.findUnique({
      where: { apiKey },
    });

    if (!org) {
      return NextResponse.json({ error: 'Unauthorized: Invalid API key' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { contactId, contactName, text, avatarUrl, tags } = body;

    if (!contactId || typeof contactId !== 'string') {
      return NextResponse.json({ error: 'Bad Request: contactId is required and must be a string' }, { status: 400 });
    }

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Bad Request: text is required and must be a string' }, { status: 400 });
    }

    // 3. Find or Create Contact
    let contact = await prisma.contact.findUnique({
      where: {
        orgId_platform_platformId: {
          orgId: org.id,
          platform: Platform.CUSTOM,
          platformId: contactId,
        },
      },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          orgId: org.id,
          platform: Platform.CUSTOM,
          platformId: contactId,
          name: contactName || `User ${contactId}`,
          avatarUrl: avatarUrl || null,
          tags: Array.isArray(tags) ? tags : [],
        },
      });
    } else if (contactName || avatarUrl || tags) {
      // Update contact if new info is provided
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          ...(contactName ? { name: contactName } : {}),
          ...(avatarUrl ? { avatarUrl } : {}),
          ...(tags ? { tags } : {}),
        }
      });
    }

    // 4. Save the incoming message
    const message = await prisma.message.create({
      data: {
        platform: Platform.CUSTOM,
        text,
        orgId: org.id,
        contactId: contact.id,
        isOutbound: false,
        isRead: false,
        platformMessageId: `custom_in_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      },
    });

    // 5. Trigger AI Auto-Responder asynchronously (don't await)
    if (contact.autoRespond) {
      import('@/lib/auto-reply').then(({ triggerAutoReply }) => {
        triggerAutoReply(message.id).catch((err: Error | unknown) => {
          console.error('[API Webhook] AI Auto-Reply Error:', err);
        });
      });
    }

    return NextResponse.json({ success: true, messageId: message.id }, { status: 201 });
  } catch (error) {
    console.error('API Incoming Message Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
