'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Users, Search, Bot, Calendar, ChevronDown, Mail, Phone, MapPin, Ticket, Menu } from 'lucide-react';
import { PlatformIcon, SafeAvatar } from '@/app/dashboard/components/dashboard-ui';
import { LeftSidebar, DEFAULT_PLATFORMS } from '@/app/dashboard/components/LeftSidebar';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

type TicketType = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
};

type Contact = {
  id: string;
  orgId: string;
  platform: string;
  platformId: string;
  name: string | null;
  avatarUrl: string | null;
  autoRespond?: boolean;
  businessNotes?: string | null;
  conversationContext?: string | null;
  createdAt: string;
  messages: {
    id: string;
    text: string;
    timestamp: string;
    isOutbound: boolean;
  }[];
  tickets?: TicketType[];
};

type BusinessNotes = {
  qualificationLabel?: string;
  qualificationScore?: number;
  extractedContactInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
};

const PLATFORMS = ['ALL', 'WA', 'IG', 'FB', 'TELEGRAM', 'TIKTOK'];
const PLATFORM_LABELS: Record<string, string> = {
  ALL: 'All Channels',
  WA: 'WhatsApp',
  IG: 'Instagram',
  FB: 'Facebook',
  TELEGRAM: 'Telegram',
  TIKTOK: 'TikTok',
};

function parseBusinessNotes(raw?: string | null): BusinessNotes {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function Avatar({ name, avatarUrl, platform }: { name: string | null; avatarUrl: string | null; platform: string }) {
  return (
    <SafeAvatar
      src={avatarUrl}
      name={name}
      className="w-9 h-9 rounded-full border border-border"
      textClassName="text-xs font-bold"
    />
  );
}

export default function InfoContactPage() {
  const { data: contacts = [], isLoading } = useSWR<Contact[]>('/api/contacts?platform=ALL', fetcher);
  const { data: orgData, mutate: mutateOrgs } = useSWR('/api/orgs', fetcher);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [showOnlyExtracted, setShowOnlyExtracted] = useState(false);

  // Filter contacts
  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const notes = parseBusinessNotes(c.businessNotes);
      const info = notes.extractedContactInfo;
      const hasTickets = c.tickets && c.tickets.length > 0;
      
      // Determine if contact shared info
      const hasSharedInfo = !!(
        info?.name?.trim() ||
        info?.email?.trim() ||
        info?.phone?.trim() ||
        info?.address?.trim() ||
        hasTickets
      );

      if (showOnlyExtracted && !hasSharedInfo) return false;

      const matchSearch =
        !search ||
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        c.platformId.toLowerCase().includes(search.toLowerCase()) ||
        (info?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (info?.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (info?.phone || '').toLowerCase().includes(search.toLowerCase());

      const matchPlatform = platformFilter === 'ALL' || c.platform === platformFilter;
      return matchSearch && matchPlatform;
    });
  }, [contacts, search, platformFilter, showOnlyExtracted]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
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
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur-xl px-4 md:px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
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
              <span className="text-sm font-bold tracking-tight text-foreground">InfoContact</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Bot className="w-4 h-4 text-primary" />
            <span>AI-Extracted Contacts:</span>
            <span className="font-semibold text-foreground bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              {filtered.length}
            </span>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-10 space-y-6 w-full">
          <div>
            <h1 className="text-3xl font-extrabold text-gradient inline-block">
              Extracted Customer Contacts
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Contacts auto-extracted from incoming customer support and sales chats.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search name, phone, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all shadow-sm"
                />
              </div>

              {/* Platform Filters */}
              <div className="flex gap-1.5 flex-wrap">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatformFilter(p)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      platformFilter === p
                        ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20'
                        : 'bg-surface border-border text-muted-foreground hover:bg-surface-muted hover:text-foreground'
                    }`}
                  >
                    {p !== 'ALL' && <PlatformIcon platform={p} size="xs" />}
                    {PLATFORM_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Extracted Filter Switch */}
            <div className="flex items-center gap-2.5 self-start md:self-auto bg-surface border border-border/80 px-4 py-2 rounded-xl shadow-sm hover:border-indigo-500/30 transition-all select-none animate-fadeIn">
              <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Only Extracted Details</span>
              <button
                type="button"
                onClick={() => setShowOnlyExtracted(!showOnlyExtracted)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out items-center px-0.5 focus:outline-none ${showOnlyExtracted ? 'bg-indigo-650' : 'bg-neutral-200 dark:bg-neutral-800'}`}
                title={showOnlyExtracted ? "Filtering only contacts with extracted details" : "Showing all contacts"}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showOnlyExtracted ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
            {/* Table Header */}
            <div className="grid grid-cols-[1.5fr_1fr_1.5fr_1.2fr_1.8fr_1fr_1fr] gap-4 px-6 py-3.5 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-surface-muted">
              <div className="flex items-center gap-1">Customer <ChevronDown className="w-3 h-3" /></div>
              <div>Platform</div>
              <div>Extracted Email</div>
              <div>Extracted Phone</div>
              <div>Extracted Address</div>
              <div>Tickets</div>
              <div>Since</div>
            </div>

            {/* Rows */}
            {isLoading ? (
              <div className="divide-y divide-border">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="grid grid-cols-[1.5fr_1fr_1.5fr_1.2fr_1.8fr_1fr_1fr] gap-4 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-surface-muted animate-pulse" />
                      <div className="h-3 w-24 bg-surface-muted rounded animate-pulse" />
                    </div>
                    <div className="h-3 w-16 bg-surface-muted rounded animate-pulse my-auto" />
                    <div className="h-3 w-32 bg-surface-muted rounded animate-pulse my-auto" />
                    <div className="h-3 w-20 bg-surface-muted rounded animate-pulse my-auto" />
                    <div className="h-3 w-40 bg-surface-muted rounded animate-pulse my-auto" />
                    <div className="h-3 w-12 bg-surface-muted rounded animate-pulse my-auto" />
                    <div className="h-3 w-16 bg-surface-muted rounded animate-pulse my-auto" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 mb-4">
                  <Users className="w-6 h-6 text-primary opacity-80" />
                </div>
                <p className="text-sm font-semibold text-foreground">No extracted contacts found</p>
                <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-normal">
                  Contact information is automatically extracted when customers share their details (name, email, phone) during a conversation.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((contact) => {
                  const notes = parseBusinessNotes(contact.businessNotes);
                  const info = notes.extractedContactInfo;
                  const ticketCount = contact.tickets?.length || 0;
                  
                  return (
                    <div
                      key={contact.id}
                      className="grid grid-cols-[1.5fr_1fr_1.5fr_1.2fr_1.8fr_1fr_1fr] gap-4 px-6 py-4.5 hover:bg-surface-muted/50 transition-colors items-center group"
                    >
                      {/* Customer */}
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={contact.name} avatarUrl={contact.avatarUrl} platform={contact.platform} />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {contact.name || info?.name || 'Unknown'}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                            ID: {contact.platformId}
                          </p>
                        </div>
                      </div>

                      {/* Platform */}
                      <div className="flex items-center gap-1.5">
                        <PlatformIcon platform={contact.platform} size="sm" />
                        <span className="text-xs text-muted-foreground">{PLATFORM_LABELS[contact.platform]}</span>
                      </div>

                      {/* Extracted Email */}
                      <div className="text-xs min-w-0">
                        {info?.email ? (
                          <div className="flex items-center gap-1.5 text-foreground">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate select-all font-medium">{info.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">—</span>
                        )}
                      </div>

                      {/* Extracted Phone */}
                      <div className="text-xs min-w-0">
                        {info?.phone ? (
                          <div className="flex items-center gap-1.5 text-foreground">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate select-all font-medium">{info.phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">—</span>
                        )}
                      </div>

                      {/* Extracted Address */}
                      <div className="text-xs min-w-0">
                        {info?.address ? (
                          <div className="flex items-center gap-1.5 text-foreground">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate text-xs leading-relaxed font-medium" title={info.address}>{info.address}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">—</span>
                        )}
                      </div>

                      {/* Tickets */}
                      <div className="flex items-center">
                        {ticketCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                            <Ticket className="w-3 h-3" />
                            {ticketCount} {ticketCount === 1 ? 'ticket' : 'tickets'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </div>

                      {/* Since */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        <span>
                          {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(contact.createdAt))}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {!isLoading && filtered.length > 0 && (
            <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider font-bold">
              Showing {filtered.length} of {contacts.length} total workspace contacts
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
