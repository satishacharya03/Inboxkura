import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrg } from '@/lib/auth';

// PATCH — update status or priority of a ticket
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const activeOrg = await getActiveOrg();
    if (!activeOrg) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { status, priority } = body;

    // Verify ticket belongs to organization
    const ticket = await prisma.ticket.findFirst({
      where: { id, orgId: activeOrg.orgId },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found or unauthorized' }, { status: 404 });
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        status: status !== undefined ? status : undefined,
        priority: priority !== undefined ? priority : undefined,
      },
      include: {
        contact: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH ticket error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE — delete a ticket
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const activeOrg = await getActiveOrg();
    if (!activeOrg) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Verify ticket belongs to organization
    const ticket = await prisma.ticket.findFirst({
      where: { id, orgId: activeOrg.orgId },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found or unauthorized' }, { status: 404 });
    }

    await prisma.ticket.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE ticket error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
