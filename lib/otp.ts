import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_for_dev_only'
);

const OTP_EXPIRES_SECONDS = 10 * 60; // 10 minutes

// ── Generate a secure 6-digit OTP ────────────────────────────────────────────
export function generateOTP(): string {
  // Cryptographically random 6-digit number padded with leading zeros
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1_000_000).padStart(6, '0');
}

// ── Sign an OTP into a short-lived JWT (stored as HttpOnly cookie) ────────────
export async function createOTPToken(email: string, otp: string, purpose: 'email_verification' | 'password_reset' = 'email_verification'): Promise<string> {
  return new SignJWT({ email, otp, purpose })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${OTP_EXPIRES_SECONDS}s`)
    .sign(JWT_SECRET);
}

// ── Verify OTP JWT + compare OTP ─────────────────────────────────────────────
export interface OTPVerifyResult {
  valid: boolean;
  email?: string;
  error?: 'expired' | 'invalid' | 'mismatch';
}

export async function verifyOTPToken(
  token: string,
  submittedOTP: string,
  expectedEmail?: string,
  expectedPurpose: 'email_verification' | 'password_reset' = 'email_verification'
): Promise<OTPVerifyResult> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Validate purpose claim
    if (payload['purpose'] !== expectedPurpose) {
      return { valid: false, error: 'invalid' };
    }

    const email = payload['email'] as string;
    const storedOTP = payload['otp'] as string;

    // Email must match if provided (defence in depth)
    if (expectedEmail && email !== expectedEmail) {
      return { valid: false, error: 'invalid' };
    }

    // Constant-time comparison to prevent timing attacks
    if (!timingSafeEqual(storedOTP, submittedOTP)) {
      return { valid: false, error: 'mismatch' };
    }

    return { valid: true, email };
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes('expired')) {
      return { valid: false, error: 'expired' };
    }
    return { valid: false, error: 'invalid' };
  }
}

// ── Extract email from OTP token without verifying OTP ───────────────────────
export async function extractEmailFromOTPToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload['purpose'] !== 'email_verification') return null;
    return payload['email'] as string;
  } catch {
    return null;
  }
}

// ── Constant-time string comparison (prevents timing attacks) ─────────────────
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
