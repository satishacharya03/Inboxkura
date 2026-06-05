import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateOTP, createOTPToken, extractEmailFromOTPToken } from '@/lib/otp';
import { sendOTPEmail } from '@/lib/resend';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const existingToken = cookieStore.get('email_otp_token')?.value;

    if (!existingToken) {
      return NextResponse.json(
        { error: 'No active verification session. Please register again.' },
        { status: 400 }
      );
    }

    // Extract email from the existing OTP token (even if expired, we need the email)
    const email = await extractEmailFromOTPToken(existingToken);

    if (!email) {
      cookieStore.delete('email_otp_token');
      return NextResponse.json(
        { error: 'Invalid verification session. Please register again.' },
        { status: 400 }
      );
    }

    // Generate a fresh OTP and new signed JWT
    const newOTP = generateOTP();
    const newOTPToken = await createOTPToken(email, newOTP);

    // Send the new OTP
    await sendOTPEmail(email, newOTP);

    // Replace the cookie with the new token (resets 10 min window)
    cookieStore.set('email_otp_token', newOTPToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Resend OTP error:', error);

    if (error instanceof Error && error.message === 'Failed to send verification email') {
      return NextResponse.json(
        { error: 'Could not send email. Please try again in a moment.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
