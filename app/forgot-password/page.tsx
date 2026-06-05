"use client";

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle, ArrowLeft, Loader2, Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

// ── Password requirements ────────────────────────────────────────────────────
const PASSWORD_RULES = [
  { id: 'length',    label: 'At least 8 characters',        test: (p: string) => p.length >= 8 },
  { id: 'upper',     label: 'One uppercase letter (A–Z)',    test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',     label: 'One lowercase letter (a–z)',    test: (p: string) => /[a-z]/.test(p) },
  { id: 'number',    label: 'One number (0–9)',              test: (p: string) => /\d/.test(p) },
  { id: 'special',   label: 'One special character (!@#$…)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function strengthScore(password: string): number {
  return PASSWORD_RULES.filter(r => r.test(password)).length;
}

function strengthLabel(score: number): { label: string; color: string } {
  if (score === 0) return { label: '', color: '' };
  if (score <= 1) return { label: 'Very weak', color: 'bg-red-500' };
  if (score === 2) return { label: 'Weak', color: 'bg-orange-500' };
  if (score === 3) return { label: 'Fair', color: 'bg-yellow-500' };
  if (score === 4) return { label: 'Good', color: 'bg-blue-500' };
  return { label: 'Strong', color: 'bg-emerald-500' };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function RequirementRow({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 text-[11px] transition-colors duration-200 ${met ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400 dark:text-neutral-500'}`}>
      <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center border transition-all duration-200 ${met ? 'bg-emerald-500/15 border-emerald-500/40' : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700'}`}>
        {met ? <Check className="w-2.5 h-2.5" /> : <X className="w-2 h-2" />}
      </span>
      {label}
    </li>
  );
}

function ForgotPasswordForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [emailTouched, setEmailTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  // Derived validation states
  const score        = strengthScore(newPassword);
  const strength     = strengthLabel(score);
  const allRulesMet  = score === PASSWORD_RULES.length;
  const emailValid   = isValidEmail(email);
  const emailError   = emailTouched && email.length > 0 && !emailValid;
  const passwordsMatch = newPassword === confirmPassword;
  const confirmError = confirmTouched && confirmPassword.length > 0 && !passwordsMatch;

  const resetReady = (
    otp.length === 6 &&
    allRulesMet &&
    passwordsMatch &&
    confirmPassword.length > 0
  );

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!emailValid) { 
      setError('Please enter a valid email address.'); 
      return; 
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      setStep(2);
      setSuccess('Verification code sent to your email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!resetReady) {
      setError('Please meet all requirements.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 transition-colors duration-300 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-gradient-from/20 rounded-full blur-[100px] opacity-50 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-gradient-to/20 rounded-full blur-[100px] opacity-50 pointer-events-none" />

      <div className="absolute top-4 left-4 sm:top-8 sm:left-8 z-10">
        <Link href="/login" className="flex items-center text-sm font-medium text-neutral-500 hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Login
        </Link>
      </div>
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-10">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full space-y-8 z-10 relative">
        {/* Logo + heading */}
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-lg mb-6 glow-brand">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Reset Password</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {step === 1 ? "Enter your email to receive a secure verification code." : "Enter the verification code and your new password."}
          </p>
        </div>

        <div className="glass p-8 rounded-3xl">
          {/* Global error / success */}
          {error && (
            <div className="mb-6 p-3 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-6 p-3 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {step === 1 ? (
            <form className="space-y-5" onSubmit={handleRequestOTP}>
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  className={`w-full bg-neutral-100/50 dark:bg-neutral-900/50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all ${
                    emailError
                      ? 'border-red-400 dark:border-red-500 focus:ring-red-400/30'
                      : emailTouched && emailValid
                      ? 'border-emerald-400 dark:border-emerald-500 focus:ring-emerald-400/30'
                      : 'border-neutral-200 dark:border-neutral-800 focus:ring-primary/50'
                  }`}
                  placeholder="you@company.com"
                  autoComplete="email"
                />
                {emailError && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Please enter a valid email address
                  </p>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || !emailValid}
                className="w-full bg-foreground text-background hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-xl px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center space-x-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Send Verification Code</span>
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleResetPassword}>
              {/* OTP */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-neutral-100/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono"
                  placeholder="000000"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-neutral-100/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="••••••••"
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {newPassword.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              i <= score ? strength.color : 'bg-neutral-200 dark:bg-neutral-700'
                            }`}
                          />
                        ))}
                      </div>
                      {strength.label && (
                        <span className={`text-[10px] font-semibold ${
                          score <= 1 ? 'text-red-500' :
                          score === 2 ? 'text-orange-500' :
                          score === 3 ? 'text-yellow-500' :
                          score === 4 ? 'text-blue-500' : 'text-emerald-500'
                        }`}>
                          {strength.label}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1.5 pl-0.5">
                      {PASSWORD_RULES.map(r => (
                        <RequirementRow key={r.id} met={r.test(newPassword)} label={r.label} />
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    onBlur={() => setConfirmTouched(true)}
                    className={`w-full bg-neutral-100/50 dark:bg-neutral-900/50 border rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 transition-all ${
                      confirmError
                        ? 'border-red-400 dark:border-red-500 focus:ring-red-400/30'
                        : confirmTouched && passwordsMatch && confirmPassword.length > 0
                        ? 'border-emerald-400 dark:border-emerald-500 focus:ring-emerald-400/30'
                        : 'border-neutral-200 dark:border-neutral-800 focus:ring-primary/50'
                    }`}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmError && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Passwords do not match
                  </p>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || !resetReady}
                className="w-full bg-foreground text-background hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-xl px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center space-x-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Reset Password</span>
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
