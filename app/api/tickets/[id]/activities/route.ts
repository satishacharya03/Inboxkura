import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrg, getAuthenticatedUser } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const org = await getActiveOrg();
    if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ticket = await prisma.ticket.findFirst({ where: { id, orgId: org.orgId } });
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const activities = await prisma.ticketActivity.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(activities);
  } catch (e) {
    console.error('GET /tickets/[id]/activities:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const org = await getActiveOrg();
    if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await getAuthenticatedUser();
    const ticket = await prisma.ticket.findFirst({ where: { id, orgId: org.orgId } });
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { content, type = 'comment' } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

    const activity = await prisma.ticketActivity.create({
      data: {
        ticketId: id,
        userId: user?.userId || null,
        type,
        content: content.trim(),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (e) {
    console.error('POST /tickets/[id]/activities:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
