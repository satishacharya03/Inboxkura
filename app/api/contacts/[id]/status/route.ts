import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrg } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const org = await getActiveOrg();
    if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { status } = await req.json();
    if (!['ACTIVE', 'SNOOZED', 'ARCHIVED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const contact = await prisma.contact.findFirst({
      where: { id, orgId: org.orgId },
    });
    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

    const updated = await prisma.contact.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, status: updated.status });
  } catch (e) {
    console.error('PATCH /contacts/[contactId]/status:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
