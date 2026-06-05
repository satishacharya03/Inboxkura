import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, getActiveOrg, hasRole } from '@/lib/auth';
import { Platform, Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const activeOrg = await getActiveOrg(user);
    if (!activeOrg) return NextResponse.json({ error: 'No active organization. Please create or join one.' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const contactId = searchParams.get('contactId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;

    const where: Prisma.MessageWhereInput = { orgId: activeOrg.orgId };
    
    if (contactId) {
      where.contactId = contactId;
    } else if (platform && platform !== 'ALL') {
      if (!Object.values(Platform).includes(platform as Platform)) {
        return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
      }
      where.platform = platform as Platform;
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { timestamp: 'desc' }, // Fetch the most recent messages first
      take: limit,
      include: {
        repliedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Reverse the array to restore chronological order (ascending) for chat display
    messages.reverse();

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Fetch Messages Error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// DELETE /api/messages?contactId=xxx — delete all messages for a contact (whole conversation)
export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const activeOrg = await getActiveOrg(user);
    if (!activeOrg) return NextResponse.json({ error: 'No active organization' }, { status: 400 });

    if (!hasRole(activeOrg.role, 'ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions. Admin or Owner role required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    if (!contactId) return NextResponse.json({ error: 'contactId is required' }, { status: 400 });

    // Verify contact belongs to this org
    const contact = await prisma.contact.findFirst({ where: { id: contactId, orgId: activeOrg.orgId } });
    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

    await prisma.message.deleteMany({ where: { contactId, orgId: activeOrg.orgId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Conversation Error:', error);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
