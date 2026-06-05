'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { LeftSidebar, DEFAULT_PLATFORMS } from '@/app/dashboard/components/LeftSidebar';
import { Menu, Users, UserPlus, Mail, Loader2, Check, Copy, Trash2, UserX, CheckCircle2, Circle } from 'lucide-react';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

type OrgMember = {
  memberId: string;
  userId: string;
  name: string | null;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER';
  joinedAt: string;
};

type OrgInvite = {
  id: string;
  email: string;
  role: string;
  inviteUrl: string;
  invitedBy: string;
  createdAt: string;
};

type PlatformStatus = {
  orgId: string;
  role: string;
  configs?: any[];
  error?: string;
};

export default function MembersPage() {
  const { data: status } = useSWR<PlatformStatus>('/api/platforms', fetcher);
  const { data: orgData, mutate: mutateOrgs } = useSWR('/api/orgs', fetcher);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const orgId = status?.orgId;
  const userRole = status?.role;
  const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER';
  const isOwner = userRole === 'OWNER';

  const { data: members = [], mutate: mutateMembers, isLoading: loadingMembers } = useSWR<OrgMember[]>(
    orgId ? `/api/orgs/${orgId}/members` : null,
    fetcher
  );
  const { data: invites = [], mutate: mutateInvites } = useSWR<OrgInvite[]>(
    orgId && isAdmin ? `/api/orgs/${orgId}/invite` : null,
    fetcher
  );

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MANAGER');
  const [isInviting, setIsInviting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !orgId || !isAdmin) return;
    setIsInviting(true);
    try {
      const res = await fetch(`/api/orgs/${orgId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', msg: 'Invite created successfully.' });
        setInviteEmail('');
        mutateInvites();
      } else {
        setNotification({ type: 'error', msg: data.error || 'Failed to invite' });
      }
    } catch {
      setNotification({ type: 'error', msg: 'Network error' });
    } finally {
      setIsInviting(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleCancelInvite = async (tokenUrl: string) => {
    if (!orgId || !isAdmin) return;
    const token = tokenUrl.split('/').pop();
    try {
      await fetch(`/api/orgs/${orgId}/invite?token=${token}`, { method: 'DELETE' });
      mutateInvites();
      setNotification({ type: 'success', msg: 'Invite cancelled.' });
    } catch {
      setNotification({ type: 'error', msg: 'Failed to cancel invite.' });
    } finally {
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!orgId || !isAdmin) return;
    if (!confirm('Remove this member?')) return;
    try {
      await fetch(`/api/orgs/${orgId}/members?userId=${userId}`, { method: 'DELETE' });
      mutateMembers();
      setNotification({ type: 'success', msg: 'Member removed.' });
    } catch {
      setNotification({ type: 'error', msg: 'Failed to remove member.' });
    } finally {
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleChangeRole = async (memberId: string, role: string) => {
    if (!orgId || !isOwner) return;
    try {
      await fetch(`/api/orgs/${orgId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      mutateMembers();
      setNotification({ type: 'success', msg: 'Role updated.' });
    } catch {
      setNotification({ type: 'error', msg: 'Failed to update role.' });
    } finally {
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      className="flex h-[100dvh] w-[100dvw] overflow-hidden bg-background text-foreground"
      style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
    >
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-right-4 ${
          notification.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/30 text-emerald-705 dark:text-emerald-300'
            : 'bg-red-50 dark:bg-red-500/10 border-red-500/30 text-red-705 dark:text-red-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Circle className="w-4 h-4 shrink-0" />}
          <span className="text-sm font-medium">{notification.msg}</span>
        </div>
      )}

      {/* LEFT SIDEBAR - Mobile Drawer + Desktop Full */}
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
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl px-4 md:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarExpanded(prev => !prev)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-muted text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Users className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold tracking-tight text-foreground">Workspace Members</span>
            </div>
          </div>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto bg-background/50">
          <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
            {/* Title / Description */}
            <div className="space-y-4">
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                Team <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-650 via-violet-650 to-indigo-750 dark:from-indigo-400 dark:to-violet-400">Members</span>
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                Manage who has access to this workspace. Owners and Admins can invite new members. Managers can view and reply to messages. To connect platforms, go to <Link href="/dashboard/integrations" className="text-indigo-600 dark:text-indigo-400 hover:underline">Integrations</Link>.
              </p>
            </div>

            {/* Invite Form */}
            {isAdmin && (
              <div className="bg-surface/50 border border-border p-6 rounded-3xl space-y-4 shadow-sm">
                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <UserPlus className="w-4 h-4 text-indigo-500" /> Invite New Member
                </h3>
                <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-indigo-500/50 transition-all animate-none"
                    />
                  </div>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                    className="bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer"
                  >
                    <option value="MANAGER" className="bg-surface">Manager</option>
                    <option value="ADMIN" className="bg-surface">Admin</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isInviting || !inviteEmail.trim()}
                    className="bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 rounded-xl px-6 py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-indigo-500/10"
                  >
                    {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invite'}
                  </button>
                </form>
              </div>
            )}

            {/* Pending Invites */}
            {invites && invites.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pending Invites</h3>
                <div className="bg-surface/30 border border-border rounded-2xl overflow-hidden divide-y divide-border">
                  {invites.map(invite => (
                    <div key={invite.id} className="flex items-center justify-between p-4 hover:bg-surface-muted/30 transition-colors">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{invite.email}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Invited by {invite.invitedBy} · {invite.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(invite.inviteUrl, invite.id)}
                          className="p-2 rounded-lg bg-surface border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                          title="Copy invite link"
                        >
                          {copiedId === invite.id ? <Check className="w-3.5 h-3.5 text-emerald-550" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleCancelInvite(invite.inviteUrl)}
                          className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-500 transition-all cursor-pointer"
                          title="Cancel invite"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Members */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Members</h3>
              {loadingMembers ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-16 bg-surface-muted/30 border border-border rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="bg-surface/30 border border-border rounded-2xl overflow-hidden divide-y divide-border">
                  {members.map(member => (
                    <div key={member.memberId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-surface-muted/30 transition-colors gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/15 flex items-center justify-center border border-indigo-500/20 text-indigo-650 dark:text-indigo-400 font-bold shrink-0 shadow-sm text-xs">
                          {(member.name || member.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{member.name || member.email}</p>
                          {member.name && <p className="text-[10px] text-muted-foreground mt-0.5">{member.email}</p>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {isOwner && member.role !== 'OWNER' ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.memberId, e.target.value)}
                            className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                          >
                            <option value="MANAGER" className="bg-surface">Manager</option>
                            <option value="ADMIN" className="bg-surface">Admin</option>
                          </select>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            member.role === 'OWNER' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-550 border border-amber-500/20' :
                            member.role === 'ADMIN' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' :
                            'bg-muted text-muted-foreground border border-border'
                          }`}>
                            {member.role}
                          </span>
                        )}

                        {isAdmin && member.role !== 'OWNER' && (
                          <button
                            onClick={() => handleRemoveMember(member.userId)}
                            className="p-1.5 rounded-lg text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                            title="Remove member"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
