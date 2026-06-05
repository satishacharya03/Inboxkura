import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
  return NextResponse.json({ success: true });
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
  return NextResponse.redirect(new URL('/login', request.url));
}
