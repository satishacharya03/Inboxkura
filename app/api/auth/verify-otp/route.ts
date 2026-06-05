import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyOTPToken } from '@/lib/otp';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_for_dev_only'
);

export async function POST(req: Request) {
  try {
    const { otp, email } = await req.json();

    if (!otp || otp.length !== 6) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit code' }, { status: 400 });
    }

    // Read the OTP token from the HttpOnly cookie
    const cookieStore = await cookies();
    const otpToken = cookieStore.get('email_otp_token')?.value;

    if (!otpToken) {
      return NextResponse.json(
        { error: 'Verification session expired. Please register again.' },
        { status: 400 }
      );
    }

    // Verify signature, expiry, email match, and OTP match
    const result = await verifyOTPToken(otpToken, otp.trim(), email);

    if (!result.valid) {
      if (result.error === 'expired') {
        cookieStore.delete('email_otp_token');
        return NextResponse.json(
          { error: 'Your verification code has expired. Please register again.' },
          { status: 400 }
        );
      }
      if (result.error === 'mismatch') {
        return NextResponse.json(
          { error: 'Incorrect code. Please check your email and try again.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: 'Invalid verification session.' }, { status: 400 });
    }

    const verifiedEmail = result.email!;

    // Look up the user
    const user = await prisma.user.findUnique({
      where: { email: verifiedEmail },
      include: {
        memberships: { select: { orgId: true }, take: 1, orderBy: { createdAt: 'asc' } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Account not found. Please register again.' }, { status: 404 });
    }

    // OTP verified — clear the OTP cookie
    cookieStore.delete('email_otp_token');

    // Issue auth JWT
    const token = await new SignJWT({ userId: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    const hasOrg = user.memberships.length > 0;

    // Auto-set first org as active
    if (hasOrg) {
      cookieStore.set('active_org_id', user.memberships[0].orgId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return NextResponse.json({ success: true, hasOrg });

  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
