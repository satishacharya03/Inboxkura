import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, requireRole } from '@/lib/auth';
import { OrgRole } from '@prisma/client';

type Params = { params: Promise<{ orgId: string; memberId: string }> };

// PATCH /api/orgs/[orgId]/members/[memberId] — change role (OWNER only)
export async function PATCH(request: Request, { params }: Params) {
  const { orgId, memberId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const caller = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: user.userId } },
  });
  if (!caller) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const guard = requireRole(caller.role, 'OWNER');
  if (guard) return guard;

  const { role } = await request.json();
  if (!role || !['ADMIN', 'MANAGER'].includes(role)) {
    return NextResponse.json({ error: 'role must be ADMIN or MANAGER' }, { status: 400 });
  }

  const target = await prisma.orgMember.findUnique({ where: { id: memberId } });
  if (!target || target.orgId !== orgId) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  if (target.role === 'OWNER') return NextResponse.json({ error: 'Cannot change owner role' }, { status: 403 });

  const updated = await prisma.orgMember.update({
    where: { id: memberId },
    data: { role: role as OrgRole },
  });

  return NextResponse.json({ success: true, memberId: updated.id, role: updated.role });
}
