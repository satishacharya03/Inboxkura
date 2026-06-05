import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, getActiveOrg, hasRole, requireRole } from '@/lib/auth';

type Params = { params: Promise<{ orgId: string }> };

// GET /api/orgs/[orgId] — org details
export async function GET(_req: Request, { params }: Params) {
  const { orgId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: user.userId } },
    include: { org: { include: { _count: { select: { members: true, messages: true } } } } },
  });
  if (!member) return NextResponse.json({ error: 'Not found or not a member' }, { status: 404 });

  return NextResponse.json({
    id:           member.org.id,
    name:         member.org.name,
    slug:         member.org.slug,
    role:         member.role,
    memberCount:  member.org._count.members,
    messageCount: member.org._count.messages,
    createdAt:    member.org.createdAt,
  });
}

// PATCH /api/orgs/[orgId] — rename org (ADMIN+)
export async function PATCH(request: Request, { params }: Params) {
  const { orgId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: user.userId } },
  });
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const guard = requireRole(member.role, 'ADMIN');
  if (guard) return guard;

  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const org = await prisma.organization.update({ where: { id: orgId }, data: { name: name.trim() } });
  return NextResponse.json({ success: true, org: { id: org.id, name: org.name } });
}

// DELETE /api/orgs/[orgId] — delete org (OWNER only)
export async function DELETE(_req: Request, { params }: Params) {
  const { orgId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: user.userId } },
  });
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const guard = requireRole(member.role, 'OWNER');
  if (guard) return guard;

  await prisma.organization.delete({ where: { id: orgId } }); // cascades all data
  return NextResponse.json({ success: true });
}
