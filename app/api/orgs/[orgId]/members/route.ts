import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, requireRole } from '@/lib/auth';

type Params = { params: Promise<{ orgId: string }> };

// GET /api/orgs/[orgId]/members
export async function GET(_req: Request, { params }: Params) {
  const { orgId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const caller = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: user.userId } },
  });
  if (!caller) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const members = await prisma.orgMember.findMany({
    where: { orgId },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(members.map(m => ({
    memberId: m.id,
    userId:   m.user.id,
    email:    m.user.email,
    name:     m.user.name,
    role:     m.role,
    joinedAt: m.createdAt,
  })));
}

// DELETE /api/orgs/[orgId]/members?userId= — remove member (ADMIN+)
export async function DELETE(request: Request, { params }: Params) {
  const { orgId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const caller = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: user.userId } },
  });
  if (!caller) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const guard = requireRole(caller.role, 'ADMIN');
  if (guard) return guard;

  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get('userId');
  if (!targetUserId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const target = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: targetUserId } },
  });
  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  if (target.role === 'OWNER') return NextResponse.json({ error: 'Cannot remove the owner' }, { status: 403 });

  await prisma.orgMember.delete({ where: { id: target.id } });
  return NextResponse.json({ success: true });
}
