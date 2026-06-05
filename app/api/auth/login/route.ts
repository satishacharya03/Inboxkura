import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_for_dev_only'
);

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: { select: { orgId: true }, take: 1, orderBy: { createdAt: 'asc' } },
      },
    });

    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    if (!user.password)
      return NextResponse.json(
        { error: 'No password set for this account. Please register.' },
        { status: 401 }
      );

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const token = await new SignJWT({ userId: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    const hasOrg = user.memberships.length > 0;

    // Auto-set first org as active if not already set
    if (hasOrg) {
      const existingActive = cookieStore.get('active_org_id')?.value;
      if (!existingActive) {
        cookieStore.set('active_org_id', user.memberships[0].orgId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60,
        });
      }
    }

    // Always go to dashboard — org creation is separate
    return NextResponse.json({
      success: true,
      hasOrg,
      user: { id: user.id, email: user.email, name: user.name },
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
