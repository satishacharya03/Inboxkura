import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrg } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const org = await getActiveOrg();
    if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { userId } = await req.json(); // null to unassign

    const contact = await prisma.contact.findFirst({
      where: { id, orgId: org.orgId },
    });
    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

    // If assigning, verify the user is an org member
    if (userId) {
      const member = await prisma.orgMember.findFirst({
        where: { orgId: org.orgId, userId },
      });
      if (!member) return NextResponse.json({ error: 'User is not an org member' }, { status: 400 });
    }

    const updated = await prisma.contact.update({
      where: { id },
      data: { assignedUserId: userId || null },
      include: { org: { include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } } } },
    });

    return NextResponse.json({ success: true, assignedUserId: updated.assignedUserId });
  } catch (e) {
    console.error('PATCH /contacts/[contactId]/assign:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
