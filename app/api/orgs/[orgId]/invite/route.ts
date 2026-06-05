import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, requireRole } from '@/lib/auth';
import { OrgRole } from '@prisma/client';
import { sendInviteEmail } from '@/lib/resend';

type Params = { params: Promise<{ orgId: string }> };

// POST /api/orgs/[orgId]/invite — send invite (ADMIN+)
export async function POST(request: Request, { params }: Params) {
  const { orgId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const caller = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: user.userId } },
    include: {
      org: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
  });
  if (!caller) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const guard = requireRole(caller.role, 'ADMIN');
  if (guard) return guard;

  const { email, role = 'MANAGER' } = await request.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
  if (!['ADMIN', 'MANAGER'].includes(role)) {
    return NextResponse.json({ error: 'role must be ADMIN or MANAGER' }, { status: 400 });
  }

  // Check if already a member
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const existing = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: existingUser.id } },
    });
    if (existing) return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
  }

  // Cancel any previous pending invites to this email for this workspace
  await prisma.invite.updateMany({
    where: {
      orgId,
      email: {
        equals: email,
        mode: 'insensitive',
      },
      status: 'PENDING',
    },
    data: {
      status: 'EXPIRED',
    },
  });

  // Create or refresh invite
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const invite = await prisma.invite.create({
    data: {
      orgId,
      email,
      role: role as OrgRole,
      invitedById: user.userId,
      expiresAt,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const inviteUrl = `${baseUrl}/invite/${invite.token}`;

  // Send the invitation email!
  try {
    const inviterName = caller.user.name || caller.user.email || 'A team member';
    await sendInviteEmail(email, caller.org.name, inviteUrl, inviterName);
    console.log(`✓ Stored and sent invite email to ${email} for workspace ${caller.org.name}`);
  } catch (emailErr) {
    console.error('⚠️ Failed to send invite email:', emailErr);
    // Non-fatal for the API call since the invite is created in the DB successfully
  }

  return NextResponse.json({
    success: true,
    inviteUrl,
    invite: { id: invite.id, email, role, expiresAt },
  }, { status: 201 });
}

// GET /api/orgs/[orgId]/invite — list pending invites (ADMIN+)
export async function GET(_req: Request, { params }: Params) {
  const { orgId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const caller = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: user.userId } },
  });
  if (!caller) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const guard = requireRole(caller.role, 'ADMIN');
  if (guard) return guard;

  const invites = await prisma.invite.findMany({
    where: { orgId, status: 'PENDING' },
    include: { invitedBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  return NextResponse.json(invites.map(i => ({
    id:         i.id,
    email:      i.email,
    role:       i.role,
    inviteUrl:  `${baseUrl}/invite/${i.token}`,
    invitedBy:  i.invitedBy.name || i.invitedBy.email,
    expiresAt:  i.expiresAt,
    createdAt:  i.createdAt,
  })));
}

// DELETE /api/orgs/[orgId]/invite?token= — cancel invite (ADMIN+)
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
  const token = searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  await prisma.invite.updateMany({
    where: { orgId, token, status: 'PENDING' },
    data:  { status: 'EXPIRED' },
  });

  return NextResponse.json({ success: true });
}
