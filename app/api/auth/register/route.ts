import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { generateOTP, createOTPToken } from '@/lib/otp';
import { sendOTPEmail } from '@/lib/resend';

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    // Password strength requirements (must match frontend rules)
    const passwordErrors: string[] = [];
    if (password.length < 8)          passwordErrors.push('at least 8 characters');
    if (!/[A-Z]/.test(password))      passwordErrors.push('one uppercase letter');
    if (!/[a-z]/.test(password))      passwordErrors.push('one lowercase letter');
    if (!/\d/.test(password))         passwordErrors.push('one number');
    if (!/[^A-Za-z0-9]/.test(password)) passwordErrors.push('one special character');

    if (passwordErrors.length > 0) {
      return NextResponse.json(
        { error: `Password must contain: ${passwordErrors.join(', ')}.` },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    // Create user immediately (unverified — no emailVerified field needed)
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { email, password: hashedPassword, name: name || null },
    });

    // Generate OTP and encode into a signed JWT (no DB storage)
    const otp = generateOTP();
    const otpToken = await createOTPToken(email, otp);

    // Send OTP via Resend
    await sendOTPEmail(email, otp);

    // Store OTP token in HttpOnly cookie (10 min expiry)
    const cookieStore = await cookies();
    cookieStore.set('email_otp_token', otpToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60, // 10 minutes
    });

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      email, // safe to send back for display
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);

    // Surface email sending failures clearly
    if (error instanceof Error && error.message === 'Failed to send verification email') {
      return NextResponse.json(
        { error: 'Could not send verification email. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
