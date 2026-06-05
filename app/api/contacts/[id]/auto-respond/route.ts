import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrg } from '@/lib/auth';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const activeOrg = await getActiveOrg();
    if (!activeOrg) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: contactId } = await context.params;
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Missing or invalid enabled field' }, { status: 400 });
    }

    // Verify contact belongs to this organization
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, orgId: activeOrg.orgId },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Update autoRespond in the database on the Contact model
    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: { autoRespond: enabled },
    });

    return NextResponse.json({ success: true, autoRespond: updatedContact.autoRespond });
  } catch (error) {
    console.error('Toggle auto-respond error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
