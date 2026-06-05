import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyOTPToken } from '@/lib/otp';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, otp, newPassword } = await request.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('pwd_reset_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Session expired. Please request a new code.' }, { status: 400 });
    }

    // Verify token
    const result = await verifyOTPToken(token, otp, email, 'password_reset');

    if (!result.valid) {
      if (result.error === 'expired') return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
      if (result.error === 'mismatch') return NextResponse.json({ error: 'Incorrect verification code. Please try again.' }, { status: 400 });
      return NextResponse.json({ error: 'Invalid verification session.' }, { status: 400 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    // Clear the OTP token
    cookieStore.delete('pwd_reset_token');

    // Optionally clear any existing auth token to force re-login
    cookieStore.delete('auth_token');

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
