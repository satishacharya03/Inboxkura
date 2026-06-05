"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle, ArrowLeft, Loader2, Mail, RefreshCw, CheckCircle2 } from 'lucide-react';

const RESEND_COOLDOWN = 60; // seconds

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Start cooldown on mount (email was just sent)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCooldown(RESEND_COOLDOWN);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleDigitChange = (index: number, value: string) => {
    // Allow only digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');

    // Auto-advance
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (digit && index === 5) {
      const completed = [...newOtp.slice(0, 5), digit];
      if (completed.every(d => d !== '')) {
        submitOTP(completed.join(''));
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    pasted.split('').forEach((char, i) => { newOtp[i] = char; });
    setOtp(newOtp);
    // Focus last filled box
    const lastIndex = Math.min(pasted.length - 1, 5);
    inputRefs.current[lastIndex]?.focus();
    if (pasted.length === 6) submitOTP(pasted);
  };

  const submitOTP = async (code: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: code, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) { setError('Please enter all 6 digits'); return; }
    submitOTP(code);
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      const res = await fetch('/api/auth/resend-otp', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend');
      setCooldown(RESEND_COOLDOWN);
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const otpFilled = otp.every(d => d !== '');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-gradient-from/20 rounded-full blur-[100px] opacity-50 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-gradient-to/20 rounded-full blur-[100px] opacity-50 pointer-events-none" />

      <div className="absolute top-4 left-4 sm:top-8 sm:left-8 z-10">
        <Link href="/login" className="flex items-center text-sm font-medium text-neutral-500 hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Login
        </Link>
      </div>

      <div className="max-w-md w-full z-10">
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-lg mb-5 glow-brand">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>

          {success ? (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-9 h-9 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Email Verified!</h1>
              <p className="text-sm text-neutral-500">Redirecting you to your dashboard…</p>
            </>
          ) : (
            <>
              <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
              <p className="text-sm text-neutral-500 leading-relaxed">
                We sent a 6-digit verification code to
                <br />
                <span className="font-semibold text-foreground">{email}</span>
              </p>
            </>
          )}
        </div>

        {!success && (
          <div className="glass p-8 rounded-3xl">
            {error && (
              <div className="mb-5 p-3 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* 6-digit OTP input boxes */}
              <div className="flex justify-center gap-2.5 mb-6" onPaste={handlePaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="\d"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    disabled={loading}
                    className={[
                      'w-11 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all',
                      'bg-neutral-100/50 dark:bg-neutral-900/50',
                      'focus:outline-none focus:ring-0',
                      digit
                        ? 'border-primary text-foreground'
                        : 'border-neutral-200 dark:border-neutral-800 text-foreground',
                      loading ? 'opacity-50 cursor-not-allowed' : '',
                    ].join(' ')}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || !otpFilled}
                className="w-full bg-foreground text-background hover:opacity-90 disabled:opacity-50 rounded-xl px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Verify Email'}
              </button>
            </form>

            {/* Resend section */}
            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-500 mb-2">Didn&apos;t receive the code?</p>
              <button
                onClick={handleResend}
                disabled={cooldown > 0 || resending}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed transition-all"
              >
                {resending
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                  : cooldown > 0
                    ? <><RefreshCw className="w-3.5 h-3.5" /> Resend in {cooldown}s</>
                    : <><RefreshCw className="w-3.5 h-3.5" /> Resend code</>
                }
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-neutral-400 mt-6">
          Wrong email?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Go back and register again
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
