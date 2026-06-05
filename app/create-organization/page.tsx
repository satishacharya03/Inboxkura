"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MessageCircle, Building2, ArrowRight, Loader2, Sparkles,
  ArrowLeft, CheckCircle2
} from 'lucide-react';

export default function CreateOrganizationPage() {
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // Guard: require auth
  useEffect(() => {
    fetch('/api/auth/me').then(res => {
      if (!res.ok) router.replace('/login');
      else setChecking(false);
    }).catch(() => router.replace('/login'));
  }, [router]);

  const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create organization');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-primary-gradient-from/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-primary-gradient-to/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Back to dashboard */}
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8 z-10">
        <Link
          href="/dashboard"
          className="flex items-center text-sm font-medium text-neutral-500 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>

      <div className="max-w-lg w-full z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-xl mb-6 glow-brand">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            New Organization
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">Create your workspace</h1>
          <p className="text-neutral-500 text-base">
            Your workspace is where your team manages all messages from Facebook, Instagram, WhatsApp, and more.
          </p>
        </div>

        {/* Card */}
        <div className="glass p-8 rounded-3xl shadow-2xl">
          {error && (
            <div className="mb-6 p-3 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                required
                autoFocus
                placeholder="Acme Corp, My Agency, Personal..."
                className="w-full bg-neutral-100/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              {slug && (
                <p className="mt-2 text-xs text-neutral-400">
                  Workspace URL: <span className="text-primary font-medium">/{slug}</span>
                </p>
              )}
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-900/40 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">You&apos;ll be able to</p>
              {[
                'Connect Facebook, Instagram, WhatsApp & more',
                'Invite team members as Admin or Manager',
                'Manage all conversations in one unified inbox',
                'Get AI-powered reply suggestions',
              ].map(feature => (
                <div key={feature} className="flex items-center gap-2.5 text-sm text-neutral-600 dark:text-neutral-300">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || !orgName.trim()}
              className="w-full bg-foreground text-background hover:opacity-90 disabled:opacity-50 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating workspace…</>
                : <><Building2 className="w-4 h-4" /> Create Workspace <ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          You can invite team members after creating your workspace.
        </p>
      </div>
    </div>
  );
}
