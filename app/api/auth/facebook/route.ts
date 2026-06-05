import { NextResponse } from 'next/server';

// Facebook login auth is disabled.
// Users log in with email/password only.
// Facebook/Instagram/WhatsApp are connected as platforms in /dashboard/integrations, not for login.
export async function GET() {
  return NextResponse.json(
    { error: 'Facebook login is disabled. Please use email and password to sign in.' },
    { status: 410 }
  );
}
