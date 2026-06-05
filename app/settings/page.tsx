'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  CheckCircle2,
  Circle,
  Menu,
  User,
} from 'lucide-react';

import { LeftSidebar, DEFAULT_PLATFORMS } from '@/app/dashboard/components/LeftSidebar';
import { PersonalTab, WorkspaceInvite } from './components/PersonalTab';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export default function SettingsPage() {
  const [profileName, setProfileName] = useState('');
  const [profilePersona, setProfilePersona] = useState('professional');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [actingInviteId, setActingInviteId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { data: orgData, mutate: mutateOrgs } = useSWR('/api/orgs', fetcher);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // Fetch current user's profile and incoming invitations
  const { data: profileData, mutate: mutateProfile } = useSWR('/api/auth/profile', fetcher);
  const { data: incomingInvites, mutate: mutateIncomingInvites } = useSWR<WorkspaceInvite[]>('/api/invites/pending', fetcher);

  useEffect(() => {
    if (profileData?.user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfileName((profileData.user as { name?: string, aiPersona?: string }).name || '');
      setProfilePersona((profileData.user as { name?: string, aiPersona?: string }).aiPersona || 'professional');
    }
  }, [profileData]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName, aiPersona: profilePersona }),
      });
      const data = await res.json();
      if (data.success) {
        mutateProfile();
        setNotification({ type: 'success', msg: 'Profile updated successfully!' });
      } else {
        setNotification({ type: 'error', msg: data.error || 'Failed to update profile' });
      }
    } catch {
      setNotification({ type: 'error', msg: 'Network error — could not save profile.' });
    } finally {
      setIsSavingProfile(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleAcceptInvite = async (token: string) => {
    setActingInviteId(token);
    try {
      const res = await fetch(`/api/invite/${token}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', msg: 'Invitation accepted! Switching workspace...' });
        mutateIncomingInvites();
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        setNotification({ type: 'error', msg: data.error || 'Failed to accept invitation.' });
      }
    } catch {
      setNotification({ type: 'error', msg: 'Failed to accept invitation due to network error.' });
    } finally {
      setActingInviteId(null);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleDeclineInvite = async (token: string) => {
    setActingInviteId(token);
    try {
      const res = await fetch(`/api/invite/${token}`, { method: 'DELETE' });
      if (res.ok) {
        setNotification({ type: 'success', msg: 'Invitation declined.' });
        mutateIncomingInvites();
      } else {
        const data = await res.json();
        setNotification({ type: 'error', msg: data.error || 'Failed to decline invitation.' });
      }
    } catch {
      setNotification({ type: 'error', msg: 'Failed to decline invitation due to network error.' });
    } finally {
      setActingInviteId(null);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      {/* LEFT SIDEBAR */}
      <div className={`h-full shrink-0 transition-all duration-300 z-50 bg-background ${isSidebarExpanded ? 'w-[280px] absolute md:relative shadow-2xl md:shadow-none' : 'w-0 md:w-[280px] overflow-hidden'}`}>
        <LeftSidebar
          activePlatform="ALL"
          setActivePlatform={() => {}}
          setSelectedMessage={() => {}}
          unreadCount={0}
          orgData={orgData}
          orgSwitcherOpen={orgSwitcherOpen}
          setOrgSwitcherOpen={setOrgSwitcherOpen}
          mutateOrgs={mutateOrgs}
          mutateMessages={async () => {}}
          mutateContacts={async () => {}}
          platforms={DEFAULT_PLATFORMS}
          setIsLeftOpen={setIsSidebarExpanded}
        />
      </div>

      {/* Overlay for mobile when sidebar is expanded */}
      {isSidebarExpanded && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarExpanded(false)}
        />
      )}

      {/* Main view container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur-xl px-4 md:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarExpanded(prev => !prev)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-muted text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold tracking-tight text-foreground">Settings</span>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto bg-background/50">
          {/* Notification Toast */}
          {notification && (
            <div className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-right-4 ${
              notification.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
            }`}>
              {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Circle className="w-4 h-4 shrink-0" />}
              <span className="text-sm font-medium">{notification.msg}</span>
            </div>
          )}

          <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
            <PersonalTab
              profileData={profileData}
              profileName={profileName}
              setProfileName={setProfileName}
              profilePersona={profilePersona}
              setProfilePersona={setProfilePersona}
              isSavingProfile={isSavingProfile}
              handleSaveProfile={handleSaveProfile}
              incomingInvites={incomingInvites}
              actingInviteId={actingInviteId}
              handleAcceptInvite={handleAcceptInvite}
              handleDeclineInvite={handleDeclineInvite}
              mutateProfile={mutateProfile}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
