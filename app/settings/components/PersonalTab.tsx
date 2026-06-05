"use client";

import { useState } from 'react';
import {
  User,
  Loader2,
  Mail,
  CheckCircle2,
  Trash2,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export type WorkspaceInvite = {
  id: string;
  orgName: string;
  invitedBy: string;
  role: string;
  token: string;
};

type PersonalTabProps = {
  profileData: Record<string, unknown> | null;
  profileName: string;
  setProfileName: (val: string) => void;
  profilePersona: string;
  setProfilePersona: (val: string) => void;
  isSavingProfile: boolean;
  handleSaveProfile: (e: React.FormEvent) => Promise<void>;
  incomingInvites: WorkspaceInvite[] | undefined;
  actingInviteId: string | null;
  handleAcceptInvite: (token: string) => Promise<void>;
  handleDeclineInvite: (token: string) => Promise<void>;
  mutateProfile?: () => void;
};



export function PersonalTab({
  profileData,
  profileName,
  setProfileName,
  profilePersona,
  setProfilePersona,
  isSavingProfile,
  handleSaveProfile,
  incomingInvites,
  actingInviteId,
  handleAcceptInvite,
  handleDeclineInvite,
  mutateProfile,
}: PersonalTabProps) {
  const userObj = profileData?.user as { aiPersona?: string, email?: string } | undefined;
  const initialDbPersona = userObj?.aiPersona || 'professional';
  const isDbPersonaCustom = !['professional', 'warm', 'sales'].includes(initialDbPersona);

  const [personaInstructions, setPersonaInstructions] = useState('');
  const [isProcessingPersona, setIsProcessingPersona] = useState(false);
  const [isClearingPersona, setIsClearingPersona] = useState(false);

  const handleRefinePersona = async () => {
    if (!personaInstructions.trim() || isProcessingPersona) return;
    setIsProcessingPersona(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions: personaInstructions }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setProfilePersona(data.user.aiPersona || 'professional');
          setPersonaInstructions('');
          if (mutateProfile) {
            mutateProfile();
          }
        }
      }
    } catch (err) {
      console.error('Error refining global persona:', err);
    } finally {
      setIsProcessingPersona(false);
    }
  };

  const handleClearCustomPersona = async () => {
    if (isClearingPersona) return;
    setIsClearingPersona(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiPersona: 'professional' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setProfilePersona(data.user.aiPersona || 'professional');
          if (mutateProfile) {
            mutateProfile();
          }
        }
      }
    } catch (err) {
      console.error('Error clearing global custom persona:', err);
    } finally {
      setIsClearingPersona(false);
    }
  };

  const isCustomActive = !['professional', 'warm', 'sales'].includes(profilePersona) && profilePersona;

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* Page Title */}
      <div className="space-y-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">Settings</span>
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Configure your user details, customize the default response tone for automated AI replies, and view incoming invites.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Profile and Tone Settings form (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleSaveProfile} className="space-y-8 bg-surface/40 border border-border/80 rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-bold flex items-center gap-2 text-foreground border-b border-border/40 pb-3">
              <User className="w-4 h-4 text-indigo-500" /> Account Profile Info
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Registered Email
                </label>
                <input
                  type="text"
                  disabled
                  value={userObj?.email || ''}
                  className="w-full bg-muted/60 border border-border rounded-xl px-3.5 py-2.5 text-xs text-muted-foreground transition-colors opacity-70 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. Satish Acharya"
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* AI Auto-Response Tone Selector Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                AI Auto-Response Tone
              </label>
              <select
                value={['professional', 'warm', 'sales'].includes(profilePersona) ? profilePersona : (isDbPersonaCustom ? initialDbPersona : 'custom')}
                onChange={(e) => {
                  const val = e.target.value;
                  setProfilePersona(val);
                }}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                <option value="professional" className="bg-surface">Professional — crisp, respectful, and direct style</option>
                <option value="warm" className="bg-surface">Warm & Friendly — conversational, polite, and helpful tone</option>
                <option value="sales" className="bg-surface">Sales Focused — persuasive, engaging, and promotional</option>
                {isDbPersonaCustom && (
                  <option value={initialDbPersona} className="bg-surface">
                    Custom AI Refined Persona ({initialDbPersona.slice(0, 30)}...)
                  </option>
                )}
                {!isDbPersonaCustom && profilePersona !== 'professional' && profilePersona !== 'warm' && profilePersona !== 'sales' && (
                  <option value={profilePersona} className="bg-surface">
                    Custom AI Refined Persona
                  </option>
                )}
              </select>
            </div>

            {/* Custom AI Persona active block (keeps custom view visible until cleared/saved) */}
            {isDbPersonaCustom && (
              <div className="bg-indigo-500/10 border border-indigo-550/20 rounded-2xl p-4 space-y-3.5 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">
                    {profilePersona === initialDbPersona ? 'Active Custom Persona:' : 'Saved Custom Persona (Not Active / Unsaved):'}
                  </span>
                  <button
                    type="button"
                    disabled={isClearingPersona}
                    onClick={handleClearCustomPersona}
                    className="text-[10.5px] text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 bg-none border-none p-0 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isClearingPersona ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Reset/Delete Custom Persona
                  </button>
                </div>
                <p className="text-xs text-foreground leading-relaxed font-semibold bg-background/50 border border-border/40 p-3 rounded-xl font-mono select-all">
                  &ldquo;{initialDbPersona}&rdquo;
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSavingProfile}
              className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:opacity-95 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border-none cursor-pointer shadow-md shadow-indigo-550/10"
            >
              {isSavingProfile ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Save Settings'}
            </button>
          </form>
        </div>

        {/* Workspace Invitations and Custom AI Tuner (Right column) */}
        <div className="space-y-6">
          {/* Custom AI Persona Tuner Panel */}
          <div className="bg-surface/40 border border-border/80 rounded-3xl p-6 space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-indigo-500/5 blur-xl" />
            
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Custom AI Persona Tuner</h4>
            </div>
            
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Define a detailed brand tone, language style, guidelines, and custom discount offers. The AI will distill these instructions into a single cohesive persona.
            </p>
            
            <div className="space-y-1.5">
              <textarea
                value={personaInstructions}
                onChange={(e) => setPersonaInstructions(e.target.value)}
                placeholder="e.g. We sell artisanal coffee beans. Speak in a casual Hinglish tone, offer a 10% coupon code (BREW10), and ask them if they prefer light or dark roast profiles."
                rows={5}
                className="w-full text-xs bg-background border border-border rounded-xl p-3 focus:outline-none focus:border-indigo-500 text-foreground placeholder:text-muted-foreground/50 transition-colors resize-none leading-relaxed font-sans"
              />
            </div>

            <button
              type="button"
              onClick={handleRefinePersona}
              disabled={!personaInstructions.trim() || isProcessingPersona}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none"
            >
              {isProcessingPersona ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Distilling tone...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Refine with AI
                </>
              )}
            </button>
          </div>

          {/* Workspace Invitations List */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-550" /> Workspace Invitations
            </h3>
            
            {incomingInvites === undefined ? (
              <div className="flex flex-col items-center justify-center p-8 bg-surface/30 border border-border rounded-3xl gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                <p className="text-[11px] text-muted-foreground">Checking invites...</p>
              </div>
            ) : incomingInvites.length === 0 ? (
              <div className="p-6 text-center bg-surface/20 border border-border/80 rounded-3xl space-y-2">
                <Mail className="w-7 h-7 mx-auto text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground font-medium">No pending invitations found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incomingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="bg-surface/50 border border-border rounded-3xl p-4 space-y-4 hover:border-border transition-colors duration-300 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                        <h4 className="text-xs font-bold text-foreground">
                          {invite.orgName}
                        </h4>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground mt-1">
                        Invited by <span className="font-semibold text-foreground">{invite.invitedBy}</span> as{' '}
                        <span className="font-semibold text-indigo-650 dark:text-indigo-400 capitalize">
                          {invite.role.toLowerCase()}
                        </span>
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptInvite(invite.token)}
                        disabled={actingInviteId === invite.token}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 rounded-xl py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer border-none shadow-sm"
                      >
                        {actingInviteId === invite.token ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeclineInvite(invite.token)}
                        disabled={actingInviteId === invite.token}
                        className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 disabled:opacity-50 rounded-xl py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        {actingInviteId === invite.token ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
