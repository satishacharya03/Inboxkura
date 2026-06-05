import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOTP, createOTPToken } from '@/lib/otp';
import { sendPasswordResetEmail } from '@/lib/resend';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success even if user not found to prevent email enumeration attacks
      return NextResponse.json({ success: true, message: 'If an account with that email exists, an OTP has been sent.' });
    }

    // Generate OTP
    const otp = generateOTP();

    // Store in cookie
    const token = await createOTPToken(email, otp, 'password_reset');
    const cookieStore = await cookies();
    cookieStore.set('pwd_reset_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60, // 10 minutes
    });

    // Send email
    await sendPasswordResetEmail(email, otp);

    return NextResponse.json({ success: true, message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
