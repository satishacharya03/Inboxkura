import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { cookies } from 'next/headers';

type Params = { params: Promise<{ token: string }> };

// GET /api/invite/[token] — validate invite, return details
export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: {
      org:       { select: { id: true, name: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  });

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  if (invite.status !== 'PENDING') return NextResponse.json({ error: 'Invite already used or expired' }, { status: 410 });
  if (new Date() > invite.expiresAt) {
    await prisma.invite.update({ where: { token }, data: { status: 'EXPIRED' } });
    return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });
  }

  return NextResponse.json({
    valid:       true,
    orgId:       invite.org.id,
    orgName:     invite.org.name,
    role:        invite.role,
    invitedBy:   invite.invitedBy.name || invite.invitedBy.email,
    email:       invite.email,
    expiresAt:   invite.expiresAt,
  });
}

// POST /api/invite/[token] — accept invite
export async function POST(_req: Request, { params }: Params) {
  const { token } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Login required to accept invite' }, { status: 401 });

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  if (invite.status !== 'PENDING') return NextResponse.json({ error: 'Invite already used or expired' }, { status: 410 });
  if (new Date() > invite.expiresAt) {
    await prisma.invite.update({ where: { token }, data: { status: 'EXPIRED' } });
    return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });
  }

  // Check if already a member
  const existing = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId: invite.orgId, userId: user.userId } },
  });

  if (!existing) {
    await prisma.orgMember.create({
      data: { orgId: invite.orgId, userId: user.userId, role: invite.role },
    });
  }

  await prisma.invite.update({ where: { token }, data: { status: 'ACCEPTED' } });

  // Set as active org
  const cookieStore = await cookies();
  cookieStore.set('active_org_id', invite.orgId, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   7 * 24 * 60 * 60,
  });

  return NextResponse.json({ success: true, orgId: invite.orgId });
}

// DELETE /api/invite/[token] — decline/ignore invite
export async function DELETE(_req: Request, { params }: Params) {
  const { token } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  
  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser || invite.email.toLowerCase() !== dbUser.email.toLowerCase()) {
    return NextResponse.json({ error: 'Unauthorized to decline this invite' }, { status: 403 });
  }

  await prisma.invite.update({
    where: { token },
    data:  { status: 'EXPIRED' },
  });

  return NextResponse.json({ success: true });
}
