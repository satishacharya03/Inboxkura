import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { email: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch pending invites matching the logged-in user's email
    const invites = await prisma.invite.findMany({
      where: {
        email: {
          equals: dbUser.email,
          mode: 'insensitive',
        },
        status: 'PENDING',
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        org: {
          select: {
            name: true,
          },
        },
        invitedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(
      invites.map((invite) => ({
        id: invite.id,
        orgId: invite.orgId,
        orgName: invite.org.name,
        role: invite.role,
        token: invite.token,
        invitedBy: invite.invitedBy.name || invite.invitedBy.email,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      }))
    );
  } catch (error) {
    console.error('Failed to fetch pending invites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
