import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, getActiveOrg } from '@/lib/auth';

// GET — fetch conversation context for a contact
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const activeOrg = await getActiveOrg(user);
    if (!activeOrg) return NextResponse.json({ error: 'No active organization' }, { status: 400 });

    const contact = await prisma.contact.findFirst({
      where: { id, orgId: activeOrg.orgId },
      select: { conversationContext: true, lastContextUpdatedAt: true },
    });

    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

    return NextResponse.json({
      conversationContext: contact.conversationContext,
      lastContextUpdatedAt: contact.lastContextUpdatedAt,
    });
  } catch (error) {
    console.error('GET context error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT — manually update or reset conversation context
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const activeOrg = await getActiveOrg(user);
    if (!activeOrg) return NextResponse.json({ error: 'No active organization' }, { status: 400 });

    const { conversationContext } = await request.json();

    const contact = await prisma.contact.updateMany({
      where: { id, orgId: activeOrg.orgId },
      data: {
        conversationContext: conversationContext || null,
        lastContextUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT context error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
