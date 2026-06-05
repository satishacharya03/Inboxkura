"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MessageCircle, Sparkles, Heart, Zap, ArrowRight, ArrowLeft,
  Loader2, User, Check, ShieldCheck, ChevronRight
} from 'lucide-react';

type Step = 'PROFILE' | 'AI_PERSONA' | 'PLATFORMS';

type PersonaOption = {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  glow: string;
};

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('PROFILE');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedPersona, setSelectedPersona] = useState('warm');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // Load current user details to initialize (including saved aiPersona)
  useEffect(() => {
    fetch('/api/auth/profile')
      .then(res => {
        if (!res.ok) {
          router.replace('/login');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data?.user) {
          setEmail(data.user.email);
          setName(data.user.name || '');
          // Pre-fill persona from DB, fall back to localStorage then default
          const savedPersona = data.user.aiPersona
            || localStorage.getItem('ai_reply_persona')
            || 'warm';
          setSelectedPersona(savedPersona);
          setChecking(false);
        }
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router]);

  const handleNextStep = async () => {
    if (step === 'PROFILE') {
      if (!name.trim()) {
        setStep('AI_PERSONA');
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/auth/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        });
        if (!res.ok) throw new Error('Failed to update name');
        setStep('AI_PERSONA');
      } catch (err) {
        console.error('Error updating name:', err);
      } finally {
        setLoading(false);
      }
    } else if (step === 'AI_PERSONA') {
      // Persist persona to database AND cache in localStorage
      setLoading(true);
      try {
        const res = await fetch('/api/auth/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aiPersona: selectedPersona }),
        });
        if (!res.ok) throw new Error('Failed to save AI persona');
        // Also cache locally for fast reads in dashboard
        localStorage.setItem('ai_reply_persona', selectedPersona);
        setStep('PLATFORMS');
      } catch (err) {
        console.error('Error saving AI persona:', err);
        // Still advance even on error — don't block the user
        localStorage.setItem('ai_reply_persona', selectedPersona);
        setStep('PLATFORMS');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBackStep = () => {
    if (step === 'AI_PERSONA') setStep('PROFILE');
    if (step === 'PLATFORMS') setStep('AI_PERSONA');
  };

  const handleComplete = () => {
    router.push('/dashboard');
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };

  const personas: PersonaOption[] = [
    {
      id: 'professional',
      name: 'Crisp & Professional',
      description: 'Polite, direct, and highly structured. Excellent for corporate, B2B services, and formal client communication.',
      icon: Sparkles,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
      glow: 'shadow-blue-500/20'
    },
    {
      id: 'warm',
      name: 'Warm & Empathetic',
      description: 'Friendly, warm, and highly encouraging. Best for building deep customer relationships, trust, and loyalty.',
      icon: Heart,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
      glow: 'shadow-rose-500/20'
    },
    {
      id: 'sales',
      name: 'Sales & Persuasive',
      description: 'Confident, highly persuasive, and focused on conversions. Perfect for ecommerce and scheduling consultations.',
      icon: Zap,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
      glow: 'shadow-amber-500/20'
    }
  ];

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic background orbs */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-primary-gradient-from/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-primary-gradient-to/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header & Skip Button */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center shadow-lg">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">InboxKura</span>
        </div>
        <button
          onClick={handleSkip}
          className="text-xs font-semibold text-neutral-500 hover:text-primary hover:bg-primary/10 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 transition-all shadow-sm"
        >
          Skip Onboarding
        </button>
      </div>

      <div className="max-w-xl w-full z-10 my-16">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className={`h-2.5 rounded-full transition-all duration-300 ${step === 'PROFILE' ? 'w-10 bg-primary' : 'w-2.5 bg-neutral-300 dark:bg-neutral-800'}`} />
          <div className={`h-2.5 rounded-full transition-all duration-300 ${step === 'AI_PERSONA' ? 'w-10 bg-primary' : 'w-2.5 bg-neutral-300 dark:bg-neutral-800'}`} />
          <div className={`h-2.5 rounded-full transition-all duration-300 ${step === 'PLATFORMS' ? 'w-10 bg-primary' : 'w-2.5 bg-neutral-300 dark:bg-neutral-800'}`} />
        </div>

        {/* Step Content Wrapper */}
        <div className="glass p-8 rounded-3xl shadow-2xl relative">
          
          {/* STEP 1: PROFILE SETUP */}
          {step === 'PROFILE' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-2">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight">Welcome to InboxKura!</h1>
                <p className="text-sm text-neutral-500 mt-1">
                  Let&apos;s complete your profile setup. How should we address you?
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Enter your full name"
                    className="w-full bg-neutral-100/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    autoFocus
                  />
                </div>

                <div className="rounded-2xl border border-border bg-neutral-50/50 dark:bg-neutral-900/30 p-4">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest block mb-1">Signed in as</span>
                  <span className="text-sm font-medium text-foreground">{email}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleNextStep}
                  disabled={loading}
                  className="bg-foreground text-background hover:opacity-90 disabled:opacity-50 rounded-xl px-5 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Next: AI Assistant <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: AI REPLY PERSONA */}
          {step === 'AI_PERSONA' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-2">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight">Choose your AI Assistant Voice</h1>
                <p className="text-sm text-neutral-500 mt-1">
                  Our integrated AI will draft smart suggestions in this exact tone.
                </p>
              </div>

              <div className="space-y-3.5">
                {personas.map(persona => {
                  const Icon = persona.icon;
                  const isSelected = selectedPersona === persona.id;
                  return (
                    <button
                      key={persona.id}
                      onClick={() => setSelectedPersona(persona.id)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-lg ' + persona.glow
                          : 'border-neutral-200 dark:border-neutral-800 bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 border ${persona.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-foreground">{persona.name}</h3>
                          {isSelected && (
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white p-0.5">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                          {persona.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={handleBackStep}
                  className="flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleNextStep}
                  className="bg-foreground text-background hover:opacity-90 rounded-xl px-5 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                >
                  Next: Platform Overview <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PLATFORM OVERVIEW */}
          {step === 'PLATFORMS' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-2">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-emerald-500" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight">Connect Channels in Workspace</h1>
                <p className="text-sm text-neutral-500 mt-1">
                  Once inside your dashboard, you can connect your channels anytime.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-neutral-50/50 dark:bg-neutral-900/30 p-5 space-y-4">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Supported Channels</p>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'Facebook Messenger', connected: true },
                    { name: 'Instagram Direct', connected: true },
                    { name: 'WhatsApp Business', connected: true },
                    { name: 'Telegram Bot', connected: true },
                  ].map(platform => (
                    <div
                      key={platform.name}
                      className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between"
                    >
                      <span className="text-xs font-medium text-foreground">{platform.name}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-start gap-2.5 text-xs text-neutral-500">
                  <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Everything is routed into one unified AI-augmented mailbox. You can configure automatic rules, canned replies, and collaborate with your team.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={handleBackStep}
                  className="flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleComplete}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 rounded-xl px-6 py-3.5 text-sm font-bold transition-all flex items-center justify-center gap-2"
                >
                  Enter Dashboard <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          You can change these profile details and AI tones anytime inside workspace Settings.
        </p>
      </div>
    </div>
  );
}
