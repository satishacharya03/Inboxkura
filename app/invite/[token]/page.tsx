"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MessageCircle, Loader2, Users, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type InviteInfo = {
  orgName:   string;
  invitedBy: string;
  role:      string;
  email:     string;
  expiresAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  OWNER:   'Owner',
  ADMIN:   'Admin',
  MANAGER: 'Manager',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN:   'Can connect platforms and manage team members',
  MANAGER: 'Can view messages and send replies',
};

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [loadError, setLoadError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState('');

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setInvite(data);
          setLoadState('valid');
        } else {
          setLoadError(data.error || 'Invalid invite');
          setLoadState('invalid');
        }
      })
      .catch(() => {
        setLoadError('Failed to load invite');
        setLoadState('invalid');
      });
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    setAcceptError('');
    try {
      const res = await fetch(`/api/invite/${token}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        // If unauthorized, need to login first
        if (res.status === 401) {
          router.push(`/login?redirect=/invite/${token}`);
          return;
        }
        throw new Error(data.error || 'Failed to accept invite');
      }
      setAccepted(true);
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : 'Failed to accept');
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-primary-gradient-from/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-primary-gradient-to/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full z-10">
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-xl mb-4 glow-brand">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">You&apos;re invited!</h1>
        </div>

        <div className="glass p-8 rounded-3xl shadow-2xl">
          {loadState === 'loading' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-neutral-400">Loading invite...</p>
            </div>
          )}

          {loadState === 'invalid' && (
            <div className="flex flex-col items-center py-8 gap-4 text-center">
              <AlertCircle className="w-12 h-12 text-red-400" />
              <h2 className="text-lg font-semibold">Invite Not Valid</h2>
              <p className="text-sm text-neutral-400">{loadError}</p>
              <Link href="/login" className="text-sm text-primary hover:underline">Go to Login</Link>
            </div>
          )}

          {loadState === 'valid' && invite && !accepted && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-neutral-400 text-sm mb-1">You&apos;ve been invited by <span className="text-foreground font-medium">{invite.invitedBy}</span></p>
                <h2 className="text-2xl font-bold">{invite.orgName}</h2>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400">Your role</p>
                    <p className="text-sm font-semibold">{ROLE_LABELS[invite.role] ?? invite.role}</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 pl-12">{ROLE_DESCRIPTIONS[invite.role] ?? ''}</p>
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <Users className="w-3.5 h-3.5" />
                Invited to: <span className="font-medium text-foreground">{invite.email}</span>
              </div>

              {acceptError && (
                <div className="p-3 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl text-center">
                  {acceptError}
                </div>
              )}

              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full bg-foreground text-background hover:opacity-90 disabled:opacity-50 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {accepting ? <><Loader2 className="w-4 h-4 animate-spin" /> Accepting...</> : 'Accept Invitation'}
              </button>

              <p className="text-center text-xs text-neutral-400">
                By accepting, you agree to join <strong>{invite.orgName}</strong>&apos;s workspace.
              </p>
            </div>
          )}

          {accepted && (
            <div className="flex flex-col items-center py-8 gap-4 text-center">
              <CheckCircle2 className="w-14 h-14 text-green-400" />
              <h2 className="text-lg font-semibold">You&apos;re in!</h2>
              <p className="text-sm text-neutral-400">Redirecting to dashboard...</p>
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
