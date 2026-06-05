import { useRef } from 'react';
import Link from 'next/link';
import { Filter, Inbox, Menu, RefreshCw, Search, X, Building2, Plus, User } from 'lucide-react';
import { Contact, Message, OrgData } from './dashboard-types';
import { formatTime, PlatformIcon, FacebookIcon, InstagramIcon, WhatsAppIcon, TikTokIcon, SafeAvatar } from './dashboard-ui';
import { Send } from 'lucide-react';

type MessageListPaneProps = {
  isLeftOpen: boolean;
  setIsLeftOpen: (open: boolean) => void;
  filtered: Contact[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  contactsLoading: boolean;
  contactsError: unknown;
  mutateContacts: () => Promise<Contact[] | undefined>;
  mutateMessages: () => Promise<Message[] | undefined>;
  selectedContact: Contact | null;
  handleSelectContact: (contact: Contact) => void;
  activePlatform?: string;
  setActivePlatform?: (platform: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  unreadCount?: number;
  orgData?: OrgData;
  isMobile?: boolean;
};

const PLATFORM_TABS = [
  { id: 'ALL', label: 'All', icon: <Inbox className="w-3.5 h-3.5" /> },
  { id: 'WA', label: 'WA', icon: <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-500" /> },
  { id: 'IG', label: 'IG', icon: <InstagramIcon className="w-3.5 h-3.5 text-pink-500" /> },
  { id: 'FB', label: 'FB', icon: <FacebookIcon className="w-3.5 h-3.5 text-blue-500" /> },
  { id: 'TELEGRAM', label: 'TG', icon: <Send className="w-3.5 h-3.5 text-sky-500" /> },
  { id: 'TIKTOK', label: 'TT', icon: <TikTokIcon className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" /> },
];

const STATUS_TABS = [
  { id: 'ACTIVE', label: 'Active' },
  { id: 'SNOOZED', label: 'Snoozed' },
  { id: 'ARCHIVED', label: 'Archived' },
];

export function MessageListPane({
  isLeftOpen,
  setIsLeftOpen,
  filtered,
  searchQuery,
  setSearchQuery,
  contactsLoading,
  contactsError,
  mutateContacts,
  mutateMessages,
  selectedContact,
  handleSelectContact,
  activePlatform,
  setActivePlatform,
  statusFilter,
  setStatusFilter,
  unreadCount,
  orgData,
  isMobile,
}: MessageListPaneProps) {
  const hasNoOrgs = orgData && orgData.orgs.length === 0;

  const dragRef = useRef<HTMLDivElement>(null);
  
  const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const slider = dragRef.current;
    if (!slider) return;
    slider.dataset.isDown = 'true';
    slider.dataset.startX = String(e.pageX - slider.offsetLeft);
    slider.dataset.scrollLeft = String(slider.scrollLeft);
  };
  
  const handleDragMouseLeave = () => {
    const slider = dragRef.current;
    if (!slider) return;
    slider.dataset.isDown = 'false';
  };
  
  const handleDragMouseUp = () => {
    const slider = dragRef.current;
    if (!slider) return;
    slider.dataset.isDown = 'false';
  };
  
  const handleDragMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const slider = dragRef.current;
    if (!slider || slider.dataset.isDown !== 'true') return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const startX = Number(slider.dataset.startX || 0);
    const scrollLeft = Number(slider.dataset.scrollLeft || 0);
    const walk = (x - startX) * 1.5;
    slider.scrollLeft = scrollLeft - walk;
  };

  return (
    <section className="h-full flex flex-col min-w-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 z-10">
      {/* Header */}
      <div className="px-3 pt-3.5 pb-2 border-b border-neutral-200 dark:border-neutral-800 flex flex-col gap-2.5 bg-white dark:bg-neutral-950">
        <div className="flex items-center gap-2 w-full">
          {!isLeftOpen && (
            <button
              onClick={() => setIsLeftOpen(true)}
              className="p-1.5 -ml-1.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
            >
              <Menu className="w-5 h-5 md:w-4 md:h-4" />
            </button>
          )}
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-450 dark:text-neutral-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg pl-8 pr-8 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {/* Refresh */}
          <button
            onClick={async () => { await mutateContacts(); await mutateMessages(); }}
            className="p-1.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all active:scale-90 shrink-0"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${contactsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Status filter tabs */}
        {setStatusFilter && (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 select-none">
            {STATUS_TABS.map(tab => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setStatusFilter(tab.id); }}
                  className={`px-3 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0 transition-all ${
                    isActive
                      ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900'
                      : 'bg-transparent text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Platform filter tabs — compact icon+label strip */}
        {setActivePlatform && (
          <div
            ref={dragRef}
            onMouseDown={handleDragMouseDown}
            onMouseLeave={handleDragMouseLeave}
            onMouseUp={handleDragMouseUp}
            onMouseMove={handleDragMouseMove}
            className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5 cursor-grab active:cursor-grabbing select-none"
          >
            {PLATFORM_TABS.map(tab => {
              const isActive = activePlatform === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActivePlatform(tab.id); }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap shrink-0 transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-neutral-950 flex flex-col">
        {hasNoOrgs ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-neutral-950 animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/5">
              <Building2 className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 mb-2">No Workspace Found</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-[210px] leading-relaxed mb-6">
              To start sending and receiving messages, create a new workspace or ask your team administrator for an invite.
            </p>
            <Link
              href="/create-organization"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 transition-all duration-150"
            >
              <Plus className="w-3.5 h-3.5" /> Create Workspace
            </Link>
          </div>
        ) : contactsLoading ? (
          <div className="flex flex-col gap-2 p-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800/50 animate-pulse">
                <div className="flex gap-2 mb-2">
                  <div className="w-4 h-4 rounded bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-24" />
                  <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-10 ml-auto" />
                </div>
                <div className="h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded w-full mb-1.5" />
                <div className="h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : !contactsLoading && Boolean(contactsError) ? (
          <div className="flex flex-col items-center justify-center h-40 text-xs text-red-600 dark:text-red-400 gap-1">
            <X className="w-5 h-5 mb-1" />
            Failed to load messages
          </div>
        ) : !contactsLoading && !contactsError && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Inbox className="w-6 h-6 opacity-20 text-neutral-500 dark:text-neutral-400" />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">No messages found</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filtered.map((contact) => {
              const lastMsg = contact.messages[0];
              const isSelected = selectedContact?.id === contact.id;
              const hasUnread = contact.messages.some(m => !m.isRead);
              return (
                <button
                  key={contact.id}
                  onClick={() => handleSelectContact(contact)}
                  className={`w-full text-left p-3 rounded-xl transition-all duration-150 group ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/25 shadow-sm'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        <SafeAvatar
                          src={contact.avatarUrl}
                          name={contact.name}
                          className="w-6 h-6 rounded-full"
                          textClassName="text-[8px] font-bold"
                        />
                        <div className="absolute bottom-[-2px] right-[-2px] bg-white dark:bg-neutral-900 rounded-full p-0.5 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shadow-sm z-10">
                          <PlatformIcon platform={contact.platform} size="xs" />
                        </div>
                      </div>
                      <span className={`text-xs font-semibold truncate ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-neutral-800 dark:text-neutral-200'}`}>
                        {contact.name || `Customer ···${contact.platformId.slice(-6)}`}
                      </span>
                      {(contact as any).assignedUserId && (
                        <div className="flex items-center justify-center w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0" title="Assigned">
                          <User className="w-2.5 h-2.5 text-neutral-500 dark:text-neutral-400" />
                        </div>
                      )}
                      {hasUnread && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      )}
                    </div>
                    {lastMsg && (
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 shrink-0 ml-2">
                        {formatTime(lastMsg.timestamp)}
                      </span>
                    )}
                  </div>
                  {lastMsg && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1 leading-relaxed">
                      {lastMsg.isOutbound ? `You: ${lastMsg.text}` : lastMsg.text}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
