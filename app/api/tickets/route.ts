import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrg } from '@/lib/auth';

// GET — fetch all tickets for the active org
export async function GET() {
  try {
    const activeOrg = await getActiveOrg();
    if (!activeOrg) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tickets = await prisma.ticket.findMany({
      where: { orgId: activeOrg.orgId },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            platform: true,
            platformId: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error('GET tickets error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST — manually create a ticket
export async function POST(request: Request) {
  try {
    const activeOrg = await getActiveOrg();
    if (!activeOrg) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { contactId, subject, description, priority, status } = body;

    if (!contactId || !subject) {
      return NextResponse.json({ error: 'Missing contactId or subject' }, { status: 400 });
    }

    const ticket = await prisma.ticket.create({
      data: {
        orgId: activeOrg.orgId,
        contactId,
        subject,
        description: description || '',
        priority: priority || 'Medium',
        status: status || 'Open',
      },
      include: {
        contact: true,
      },
    });

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('POST ticket error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
