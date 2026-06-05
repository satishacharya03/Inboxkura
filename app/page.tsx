"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageCircle, Sparkles, ArrowRight, Layers, Bot, Zap,
  Shield, Users, Webhook, Clock, CheckCircle, ChevronRight,
  BarChart3, Globe, Star, Send, Download
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TelegramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.026 9.547c-.153.672-.554.836-1.124.521l-3.073-2.265-1.483 1.428c-.164.164-.303.303-.621.303l.222-3.148 5.73-5.176c.249-.222-.054-.346-.386-.124l-7.08 4.458-3.048-.953c-.663-.207-.675-.663.138-.981l11.905-4.589c.553-.2 1.036.124.846.979z" />
    </svg>
  );
}

function TikTokIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64c.3 0 .6.05.89.14V9.4a6.34 6.34 0 00-.89-.06A6.33 6.33 0 003.16 15.65a6.34 6.34 0 0010.86 4.43 6.28 6.28 0 001.76-4.4V8.56a8.2 8.2 0 004.81 1.54V6.69z" />
    </svg>
  );
}

const STATS = [
  { label: '5 Platforms', icon: <Globe className="w-4 h-4" /> },
  { label: 'Gemini AI', icon: <Sparkles className="w-4 h-4" /> },
  { label: 'Real-time Webhooks', icon: <Webhook className="w-4 h-4" /> },
  { label: 'Team Collaboration', icon: <Users className="w-4 h-4" /> },
  { label: 'Always On', icon: <Clock className="w-4 h-4" /> },
];

const PLATFORMS = [
  { name: 'Facebook', icon: <FacebookIcon size={22} />, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-500' },
  { name: 'Instagram', icon: <InstagramIcon size={22} />, color: 'text-pink-500', bg: 'bg-pink-500/10 border-pink-500/20', dot: 'bg-pink-500' },
  { name: 'WhatsApp', icon: <WhatsAppIcon size={22} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500' },
  { name: 'Telegram', icon: <TelegramIcon size={22} />, color: 'text-sky-500', bg: 'bg-sky-500/10 border-sky-500/20', dot: 'bg-sky-500' },
  { name: 'TikTok', icon: <TikTokIcon size={22} />, color: 'text-neutral-700 dark:text-neutral-100', bg: 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700', dot: 'bg-neutral-600 dark:bg-neutral-300' },
];

const FEATURES = [
  {
    icon: <Layers className="w-5 h-5" />,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 border-blue-500/20',
    title: 'Unified Inbox',
    desc: 'All messages from FB Messenger, Instagram DMs, WhatsApp, Telegram, and TikTok in one stream.',
  },
  {
    icon: <Bot className="w-5 h-5" />,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10 border-violet-500/20',
    title: 'Sentiment Analysis',
    desc: 'Instantly know if a customer is happy, frustrated, or neutral before you read the first word.',
  },
  {
    icon: <Zap className="w-5 h-5" />,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 border-amber-500/20',
    title: 'AI Suggested Drafts',
    desc: 'Gemini AI reads the conversation and drafts 3 contextual reply options, ready to send.',
  },
  {
    icon: <Users className="w-5 h-5" />,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    title: 'Team Collaboration',
    desc: 'Invite teammates as Owners, Admins, or Managers. Everyone sees the same inbox in real-time.',
  },
  {
    icon: <Webhook className="w-5 h-5" />,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10 border-rose-500/20',
    title: 'Real-time Webhooks',
    desc: 'Messages arrive via official Meta, Telegram, and TikTok webhooks — zero polling, instant delivery.',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    title: 'Secure & Private',
    desc: 'JWT auth, HttpOnly cookies, Neon PostgreSQL, and signature-verified webhooks. Built for modern business teams.',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Connect your platforms',
    desc: 'OAuth into Facebook, Instagram, or WhatsApp in one click. Paste your Telegram Business Connection ID. Done.',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    number: '02',
    title: 'Messages flow in automatically',
    desc: 'All inbound messages from every connected channel appear in a single, searchable inbox in real-time.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    number: '03',
    title: 'Reply with AI assistance',
    desc: 'Pick one of 3 AI-drafted replies or ask the AI Agent to refine your response. Send with one click.',
    color: 'from-pink-500 to-rose-600',
  },
];

export default function Home() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDownloadClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] Install outcome: ${outcome}`);
      setDeferredPrompt(null);
    } else {
      alert("To install InboxKura on your device:\n\n• On Desktop (Chrome/Edge): Click the Install icon (+) in the browser address bar.\n• On iOS/Safari: Tap Share ⎙ and select 'Add to Home Screen'.\n• On Android/Chrome: Tap the 3-dot menu and select 'Install app'.");
    }
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300 relative overflow-x-hidden"
      style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
    >
      {/* Background ambient gradients */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-15%] left-[-5%] w-[700px] h-[700px] bg-indigo-500/8 dark:bg-indigo-500/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-rose-500/8 dark:bg-rose-500/5 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-violet-500/5 dark:bg-violet-500/3 rounded-full blur-[100px] -translate-x-1/2" />
      </div>

      {/* ─── Navigation ─── */}
      <nav className="w-full flex items-center justify-between px-6 sm:px-12 py-5 z-20 fixed top-0 left-0 bg-background/80 backdrop-blur-xl border-b border-neutral-200/20 dark:border-neutral-800/30 transition-all duration-300">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 via-violet-50 to-rose-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <MessageCircle className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-foreground">Inbox Kura</span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleDownloadClick}
            className="p-2 rounded-xl text-neutral-500 hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all flex items-center gap-1.5 font-semibold text-xs border border-transparent hover:border-indigo-200 dark:hover:border-indigo-500/20 cursor-pointer"
            title="Download/Install App"
          >
            <Download className="w-4 h-4 shrink-0 animate-bounce" />
            <span className="hidden md:inline">Install App</span>
          </button>
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden sm:flex items-center gap-2 bg-foreground text-background hover:opacity-90 px-5 py-2 rounded-full text-sm font-semibold transition-all hover:scale-105 shadow-sm"
          >
            Sign In <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <main className="flex-1 flex flex-col items-center relative z-10 w-full">
        <section className="w-full flex flex-col items-center text-center px-4 pt-24 sm:pt-28 pb-16">

          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-full px-4 py-1.5 mb-8 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Powered by Gemini AI</span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight max-w-4xl mb-6 leading-[1.1]">
            Unify your social inbox with{' '}
            <span className="text-gradient">intelligent replies</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            Manage Facebook, Instagram, WhatsApp, Telegram and TikTok messages from one dashboard. 
            Let AI analyze sentiment, categorize intent, and draft perfect responses automatically.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-16">
            <Link
              href="/login"
              className="flex items-center gap-2 bg-foreground text-background hover:opacity-90 px-8 py-4 rounded-full text-base font-bold transition-all shadow-xl hover:scale-105 hover:shadow-2xl"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-8 py-4 rounded-full text-base font-semibold transition-all text-foreground"
            >
              <span>Open Dashboard</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 max-w-2xl">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full px-4 py-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 shadow-sm"
              >
                <span className="text-indigo-500">{s.icon}</span>
                {s.label}
              </div>
            ))}
          </div>
        </section>

        {/* ─── Platform Showcase ─── */}
        <section className="w-full max-w-5xl mx-auto px-6 pb-24">
          <div className="text-center mb-10">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Works with all your platforms</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              5 channels. <span className="text-gradient">One inbox.</span>
            </h2>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {PLATFORMS.map((p) => (
              <div
                key={p.name}
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${p.bg} transition-all hover:scale-105 cursor-default shadow-sm`}
              >
                <span className={p.color}>{p.icon}</span>
                <span className={`font-bold text-sm ${p.color}`}>{p.name}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${p.dot} animate-pulse`} />
              </div>
            ))}
          </div>
        </section>

        {/* ─── Features Grid ─── */}
        <section className="w-full max-w-5xl mx-auto px-6 pb-24">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Everything you need</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Built for real customer <span className="text-gradient">support teams</span>
            </h2>
            <p className="text-base text-muted-foreground mt-3 max-w-xl mx-auto leading-relaxed">
              From solo founders to multi-member teams — InboxKura scales with your operation.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 rounded-3xl p-6 transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className={`w-11 h-11 rounded-2xl ${f.bg} border flex items-center justify-center mb-4 ${f.color} transition-transform group-hover:scale-110`}>
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── How It Works ─── */}
        <section className="w-full max-w-5xl mx-auto px-6 pb-24">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Simple setup</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Up and running in <span className="text-gradient">3 steps</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, idx) => (
              <div key={step.number} className="relative">
                {idx < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(100%+12px)] w-[calc(100%-24px)] h-px bg-gradient-to-r from-border to-transparent z-10" />
                )}
                <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 h-full hover:shadow-lg transition-all hover:-translate-y-0.5">
                  <div className={`inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} items-center justify-center mb-5 shadow-lg`}>
                    <span className="text-white text-xl font-black">{step.number}</span>
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Social Proof / Quote ─── */}
        <section className="w-full max-w-5xl mx-auto px-6 pb-24">
          <div className="relative bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10 border border-indigo-200/60 dark:border-indigo-500/20 rounded-3xl p-10 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-400/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/10 rounded-full blur-[60px] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex justify-center gap-1 mb-5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="text-xl sm:text-2xl font-bold text-foreground leading-relaxed max-w-2xl mx-auto mb-6">
                &ldquo;Finally, one place for everything. The AI-suggested replies save us hours every week.&rdquo;
              </blockquote>
              <div className="flex items-center justify-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
                  T
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground">Team Lead</p>
                  <p className="text-xs text-muted-foreground">InboxKura Business User</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Bottom CTA ─── */}
        <section className="w-full px-6 pb-24">
          <div className="max-w-4xl mx-auto relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-rose-500 p-12 text-center shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-4 py-1.5 mb-6">
                <CheckCircle className="w-3.5 h-3.5 text-white" />
                <span className="text-sm font-semibold text-white">Enterprise Suite · Secure & Scalable</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
                Ready to unify your inbox?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
                Connect your platforms, invite your team, and start replying smarter — today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/login"
                  className="flex items-center gap-2 bg-white text-indigo-600 hover:bg-indigo-50 px-8 py-4 rounded-full text-base font-bold transition-all hover:scale-105 shadow-xl"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white px-8 py-4 rounded-full text-base font-semibold transition-all"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Open Dashboard</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="w-full border-t border-border bg-surface-muted z-10 relative">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-rose-500 flex items-center justify-center shadow-md">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">InboxKura</p>
                <p className="text-xs text-muted-foreground">Business Inbox Management Suite</p>
              </div>
            </div>

            {/* Platform icons */}
            <div className="flex items-center gap-3">
              <span className="text-blue-500"><FacebookIcon size={16} /></span>
              <span className="text-pink-500"><InstagramIcon size={16} /></span>
              <span className="text-emerald-500"><WhatsAppIcon size={16} /></span>
              <span className="text-sky-500"><TelegramIcon size={16} /></span>
              <span className="text-neutral-600 dark:text-neutral-300"><TikTokIcon size={16} /></span>
            </div>

            <div className="flex items-center gap-5 text-sm font-medium">
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
              <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
            </div>
          </div>
          <div className="border-t border-border mt-6 pt-6 text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} InboxKura. Enterprise-grade secure communication workspace. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
