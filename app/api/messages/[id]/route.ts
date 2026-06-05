import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, getActiveOrg, hasRole } from '@/lib/auth';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const activeOrg = await getActiveOrg(user);
    if (!activeOrg) return NextResponse.json({ error: 'No active organization' }, { status: 400 });

    // Only ADMIN or OWNER can delete messages
    if (!hasRole(activeOrg.role, 'ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions. Admin or Owner role required.' }, { status: 403 });
    }

    const { id } = await params;

    // Make sure message belongs to this org
    const message = await prisma.message.findFirst({
      where: { id, orgId: activeOrg.orgId },
    });
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    await prisma.message.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Message Error:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
