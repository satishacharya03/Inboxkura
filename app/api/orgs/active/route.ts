import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { cookies } from 'next/headers';

// POST /api/orgs/active — switch active org
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { orgId } = await request.json();
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: user.userId } },
  });
  if (!member) return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });

  const cookieStore = await cookies();
  cookieStore.set('active_org_id', orgId, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   7 * 24 * 60 * 60,
  });

  return NextResponse.json({ success: true, orgId, role: member.role });
}
