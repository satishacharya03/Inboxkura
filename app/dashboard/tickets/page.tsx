'use client';

import { useState, useMemo } from 'react';

import useSWR from 'swr';
import { 
  Ticket, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  User, 
  X, 
  Check, 
  ChevronDown, 
  Sparkles, 
  AlertTriangle,
  Menu
} from 'lucide-react';
import { PlatformIcon } from '@/app/dashboard/components/dashboard-ui';
import { LeftSidebar, DEFAULT_PLATFORMS } from '@/app/dashboard/components/LeftSidebar';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

type TicketStatus = 'Open' | 'In Progress' | 'Resolved';
type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

type ContactInfo = {
  id: string;
  name: string | null;
  platform: string;
  platformId: string;
  avatarUrl: string | null;
};

type DbTicket = {
  id: string;
  contactId: string;
  contact: ContactInfo;
  subject: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
};

const STATUS_FILTERS: { label: string; value: TicketStatus | 'All' }[] = [
  { label: 'All Cases', value: 'All' },
  { label: 'Open', value: 'Open' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Resolved', value: 'Resolved' },
];

const STATUS_STYLES: Record<TicketStatus, { bg: string; text: string; border: string; glow: string; icon: React.ElementType }> = {
  Open: { 
    bg: 'bg-rose-500/10 dark:bg-rose-500/5', 
    text: 'text-rose-600 dark:text-rose-400', 
    border: 'border-rose-200 dark:border-rose-500/20', 
    glow: 'shadow-rose-500/10',
    icon: AlertCircle 
  },
  'In Progress': { 
    bg: 'bg-amber-500/10 dark:bg-amber-500/5', 
    text: 'text-amber-600 dark:text-amber-400', 
    border: 'border-amber-200 dark:border-amber-500/20', 
    glow: 'shadow-amber-500/10',
    icon: Loader2 
  },
  Resolved: { 
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/5', 
    text: 'text-emerald-605 dark:text-emerald-400', 
    border: 'border-emerald-200 dark:border-emerald-500/20', 
    glow: 'shadow-emerald-500/10',
    icon: CheckCircle2 
  },
};

const PRIORITY_STYLES: Record<TicketPriority, { dot: string; text: string; bar: string; labelBg: string }> = {
  Urgent: { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bar: 'bg-rose-500', labelBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  High: { dot: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', bar: 'bg-orange-550', labelBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  Medium: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500', labelBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  Low: { dot: 'bg-sky-500', text: 'text-sky-605 dark:text-sky-400', bar: 'bg-sky-550', labelBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
};

const PLATFORM_LABELS: Record<string, string> = {
  WA: 'WhatsApp', IG: 'Instagram', FB: 'Facebook', TELEGRAM: 'Telegram', TIKTOK: 'TikTok',
};

export default function TicketsPage() {
  const { data: tickets = [], isLoading, mutate } = useSWR<DbTicket[]>('/api/tickets', fetcher);
  const { data: contacts = [] } = useSWR<ContactInfo[]>('/api/contacts?platform=ALL', fetcher);
  const { data: orgData, mutate: mutateOrgs } = useSWR('/api/orgs', fetcher);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'All'>('All');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // New ticket state
  const [targetContactId, setTargetContactId] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>('Medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = useMemo(() => {
    if (statusFilter === 'All') return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  const counts = useMemo(() => ({
    All: tickets.length,
    Open: tickets.filter((t) => t.status === 'Open').length,
    'In Progress': tickets.filter((t) => t.status === 'In Progress').length,
    Resolved: tickets.filter((t) => t.status === 'Resolved').length,
  }), [tickets]);

  const handleUpdateStatus = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        mutate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActiveMenuId(null);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetContactId || !ticketSubject.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: targetContactId,
          subject: ticketSubject.trim(),
          description: ticketDesc.trim(),
          priority: ticketPriority,
          status: 'Open',
        }),
      });
      if (res.ok) {
        mutate();
        setShowCreateModal(false);
        // Reset form
        setTargetContactId('');
        setTicketSubject('');
        setTicketDesc('');
        setTicketPriority('Medium');
      } else {
        alert('Failed to create ticket.');
      }
    } catch (e) {
      console.error(e);
      alert('Error creating ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-background text-foreground"
      style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
    >
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
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background/30">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-border bg-surface/85 backdrop-blur-xl px-4 md:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarExpanded(prev => !prev)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-muted text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-550/25">
                <Ticket className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold tracking-tight text-foreground">Support Tickets</span>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white text-xs font-bold hover:opacity-95 transition-opacity shadow-lg shadow-orange-550/20 cursor-pointer border-none"
          >
            <Plus className="w-4 h-4" />
            Create Ticket
          </button>
        </header>

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto">
          <main className="max-w-5xl mx-auto px-6 py-8 space-y-8 animate-in fade-in duration-300">
            {/* Title Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  Ticketing <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500">Center</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Track, route, and resolve client inquiries using high-priority queues.</p>
              </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Unassigned/Open', count: counts.Open, color: 'from-rose-500/10 to-rose-500/0', border: 'border-rose-200 dark:border-rose-500/20', text: 'text-rose-600 dark:text-rose-400', icon: AlertTriangle, status: 'Open' },
                { label: 'In Progress', count: counts['In Progress'], color: 'from-amber-500/10 to-amber-500/0', border: 'border-amber-200 dark:border-amber-500/20', text: 'text-amber-600 dark:text-amber-400', icon: Loader2, status: 'In Progress' },
                { label: 'Resolved Cases', count: counts.Resolved, color: 'from-emerald-500/10 to-emerald-500/0', border: 'border-emerald-200 dark:border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2, status: 'Resolved' },
              ].map((s, idx) => (
                <button 
                  key={idx}
                  onClick={() => setStatusFilter(s.status as TicketStatus | 'All')}
                  className={`group text-left rounded-3xl bg-gradient-to-br ${s.color} border ${s.border} p-5 hover:bg-background/40 transition-all duration-300 relative overflow-hidden flex flex-col justify-between cursor-pointer`}
                >
                  <div className="flex items-center justify-between w-full">
                    <s.icon className={`w-5 h-5 ${s.text} ${s.label === 'In Progress' && counts['In Progress'] > 0 ? 'animate-spin' : ''}`} />
                    <span className={`text-2xl font-black ${s.text} tabular-nums`}>{s.count}</span>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-4">{s.label}</p>
                </button>
              ))}
            </div>

            {/* Filter Pill Selection bar */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center bg-muted/65 border border-border p-1 rounded-xl gap-0.5">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      statusFilter === f.value
                        ? 'bg-surface text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground font-semibold font-mono">
                Showing {filtered.length} tickets
              </span>
            </div>

            {/* Support Ticket Cards List */}
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-surface-muted/30 border border-border rounded-3xl animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border/80 bg-surface/20 p-16 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                  <Ticket className="w-7 h-7 text-amber-500 opacity-60" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">No Tickets in this Queue</h3>
                <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                  Everything caught up! Select another filter or manually create a ticket.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((ticket) => {
                  const priority = PRIORITY_STYLES[ticket.priority];
                  const statusStyle = STATUS_STYLES[ticket.status];
                  const StatusIcon = statusStyle.icon;

                  return (
                    <div
                      key={ticket.id}
                      className="group relative rounded-3xl border border-border/80 bg-surface/40 hover:bg-surface/75 hover:shadow-md hover:border-border transition-all duration-300 p-5 pl-7 overflow-hidden"
                    >
                      {/* Priority left color accent bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${priority.bar}`} />

                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-2.5">
                          {/* Top metadata tags */}
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted/80 border border-border/60 px-2 py-0.5 rounded-lg select-all">
                              ID: {ticket.id}
                            </span>

                            {/* Ticket Status Select Menu Popover */}
                            <div className="relative">
                              <button
                                onClick={() => setActiveMenuId(activeMenuId === ticket.id ? null : ticket.id)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border transition-colors cursor-pointer ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}
                              >
                                <StatusIcon className={`w-3.5 h-3.5 ${ticket.status === 'In Progress' ? 'animate-spin' : ''}`} />
                                <span>{ticket.status}</span>
                                <ChevronDown className="w-3 h-3 opacity-60" />
                              </button>

                              {activeMenuId === ticket.id && (
                                <>
                                  <div className="fixed inset-0 z-30" onClick={() => setActiveMenuId(null)} />
                                  <div className="absolute left-0 top-full mt-1.5 bg-surface border border-border rounded-xl shadow-2xl z-40 py-1 w-36 overflow-hidden animate-in fade-in duration-200">
                                    {(['Open', 'In Progress', 'Resolved'] as TicketStatus[]).map((st) => (
                                      <button
                                        key={st}
                                        onClick={() => handleUpdateStatus(ticket.id, st)}
                                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                          ticket.status === st 
                                            ? 'bg-muted text-foreground font-bold' 
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                      >
                                        {st}
                                        {ticket.status === st && <Check className="w-3.5 h-3.5 text-amber-550" />}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Priority tag */}
                            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-lg ${priority.labelBg}`}>
                              {ticket.priority} Priority
                            </span>
                          </div>

                          {/* Ticket Content */}
                          <div>
                            <h3 className="text-base font-bold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-snug">
                              {ticket.subject}
                            </h3>
                            {ticket.description && (
                              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-sans max-w-3xl">
                                {ticket.description}
                              </p>
                            )}
                          </div>

                          {/* Customer Profile card metadata */}
                          <div className="flex items-center gap-3 pt-1 flex-wrap">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/10 to-violet-500/15 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 font-extrabold flex items-center justify-center text-xs shrink-0 shadow-sm">
                              {((ticket.contact?.name || 'C')[0]).toUpperCase()}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">
                                {ticket.contact?.name || `Customer ···${ticket.contact?.platformId.slice(-6)}`}
                              </span>
                              <span className="text-muted-foreground/50">·</span>
                              <PlatformIcon platform={ticket.contact?.platform} size="xs" />
                              <span className="text-[10px] uppercase font-bold text-muted-foreground">
                                {PLATFORM_LABELS[ticket.contact?.platform] || ticket.contact?.platform}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Created time */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 mt-2 md:mt-0 font-medium">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                          <span>
                            {new Intl.DateTimeFormat('en-US', { 
                              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true 
                            }).format(new Date(ticket.createdAt))}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Glassmorphic Create Ticket Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-surface/90 border border-border/80 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-250 text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg text-white shrink-0">
                  <Ticket className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">File Support Case</h2>
                  <p className="text-[11px] text-muted-foreground font-medium">Open a manual ticket for a customer profile</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors border border-transparent cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              {/* Select Customer */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Contact Profile</label>
                <select
                  value={targetContactId}
                  onChange={(e) => setTargetContactId(e.target.value)}
                  required
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
                >
                  <option value="" disabled className="bg-surface">Select a customer...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id} className="bg-surface">
                      {c.name || `Customer (···${c.platformId.slice(-6)})`} ({PLATFORM_LABELS[c.platform] || c.platform})
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Subject / Issue Summary</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Broken links or payment checkout error"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Additional Description</label>
                <textarea
                  rows={3}
                  placeholder="Log details, steps to reproduce or specific logs..."
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50 transition-colors resize-none leading-relaxed"
                />
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Severity Priority</label>
                <select
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value as TicketPriority)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
                >
                  <option value="Low" className="bg-surface">Low Priority</option>
                  <option value="Medium" className="bg-surface">Medium Priority</option>
                  <option value="High" className="bg-surface">High Priority</option>
                  <option value="Urgent" className="bg-surface">Urgent Severity</option>
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:opacity-95 text-xs font-bold transition-all shadow-lg disabled:opacity-50 cursor-pointer border-none"
                >
                  {isSubmitting ? 'Submitting...' : 'File Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
