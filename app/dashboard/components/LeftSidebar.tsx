'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart2, Bot, Building2, ChevronDown, Inbox, LayoutGrid,
  LogOut, MessageCircle, PanelLeftClose, Plus, Send, Settings,
  Ticket, Users, Zap,
} from 'lucide-react';
import { Dispatch, ReactNode, SetStateAction } from 'react';
import { OrgData } from './dashboard-types';
import { FacebookIcon, InstagramIcon, WhatsAppIcon, TikTokIcon, TelegramIcon } from './dashboard-ui';
import { ThemeToggle } from '@/components/ThemeToggle';

type PlatformItem = { id: string; label: string; icon: ReactNode };

type LeftSidebarProps = {
  activePlatform: string;
  setActivePlatform: (platform: string) => void;
  setSelectedMessage: (msg: null) => void;
  unreadCount: number;
  orgData?: OrgData;
  orgSwitcherOpen: boolean;
  setOrgSwitcherOpen: Dispatch<SetStateAction<boolean>>;
  mutateOrgs: () => Promise<OrgData | undefined>;
  mutateMessages: () => Promise<unknown>;
  mutateContacts: () => Promise<unknown>;
  platforms: PlatformItem[];
  setIsLeftOpen: (open: boolean) => void;
};

export function LeftSidebar({
  activePlatform,
  setActivePlatform,
  setSelectedMessage,
  unreadCount,
  orgData,
  orgSwitcherOpen,
  setOrgSwitcherOpen,
  mutateOrgs,
  mutateMessages,
  mutateContacts,
  platforms,
  setIsLeftOpen,
}: LeftSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Detect active query tab for Members
  const isMembersActive = pathname === '/dashboard/members';
  const isSettingsActive = pathname === '/settings';

  const getLinkClass = (path: string, isActiveOverride?: boolean) => {
    const isActive = isActiveOverride !== undefined ? isActiveOverride : pathname === path;

    return `group flex items-center gap-2.5 w-full px-2.5 py-2.5 rounded-lg text-sm transition-all duration-150 font-semibold border ${
      isActive
        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-705 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/20 shadow-sm'
        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 border-transparent'
    }`;
  };

  return (
    <aside className="h-full w-full flex flex-col min-w-0 bg-neutral-50 dark:bg-neutral-900/60 border-r border-neutral-200 dark:border-neutral-800 backdrop-blur-sm transition-all duration-300 ease-in-out">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-4">
          {pathname === '/dashboard' && (
            <button
              type="button"
              onClick={() => setIsLeftOpen(false)}
              className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all shrink-0 border border-transparent cursor-pointer"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
              <MessageCircle className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="block font-bold text-sm tracking-tight text-neutral-900 dark:text-neutral-100 whitespace-nowrap truncate">InboxKura</span>
            </div>
          </div>
        </div>

        {/* Org switcher */}
        <div className="relative">
          <button
            onClick={() => setOrgSwitcherOpen(o => !o)}
            className="w-full flex items-center gap-2 py-2 rounded-lg bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 transition-all shadow-sm cursor-pointer px-2.5"
          >
            <Building2 className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />
            <span className="truncate flex-1 text-left">
              {orgData
                ? (orgData.orgs.find(o => o.orgId === orgData.activeOrgId)?.name ?? (orgData.orgs.length === 0 ? 'No Workspace' : 'Select Workspace'))
                : 'Loading...'}
            </span>
            <ChevronDown className="w-3 h-3 text-neutral-400 dark:text-neutral-500 shrink-0" />
          </button>
          {orgSwitcherOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
              {orgData?.orgs.map(org => (
                <button
                  key={org.orgId}
                  onClick={async () => {
                    await fetch('/api/orgs/active', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orgId: org.orgId }),
                    });
                    setOrgSwitcherOpen(false);
                    await mutateOrgs();
                    await mutateMessages();
                    await mutateContacts();
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    org.orgId === orgData?.activeOrgId
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 font-semibold'
                      : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                  }`}
                >
                  <Building2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">{org.name}</span>
                  <span className="ml-auto text-[9px] text-neutral-400 dark:text-neutral-500">{org.role}</span>
                </button>
              ))}
              <div className="border-t border-neutral-200 dark:border-neutral-700 mt-1 pt-1">
                <Link
                  href="/create-organization"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all"
                  onClick={() => setOrgSwitcherOpen(false)}
                >
                  <Plus className="w-3 h-3" /> New workspace
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto w-full">
        {/* Main Section */}
        <p className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest px-2 mb-2">Main</p>

        {/* Conversations — primary nav item */}
        <button
          title="Conversations"
          onClick={() => {
            if (pathname !== '/dashboard') {
              router.push('/dashboard');
            } else {
              setActivePlatform('ALL');
              setSelectedMessage(null);
            }
          }}
          className={getLinkClass('/dashboard')}
        >
          <Inbox className={`w-4 h-4 shrink-0 ${pathname === '/dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-500'}`} />
          <span className="whitespace-nowrap font-medium">Conversations</span>
          {unreadCount > 0 && (
            <span className="ml-auto text-[10px] font-bold bg-indigo-600 text-white rounded-full px-1.5 py-0.5 leading-none">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Management Section */}
        <div className="pt-4">
          <p className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest px-2 mb-2">Management</p>

          <Link
            title="InfoContact"
            href="/dashboard/infocontact"
            className={getLinkClass('/dashboard/infocontact')}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>InfoContact</span>
          </Link>

          <Link
            title="Tickets"
            href="/dashboard/tickets"
            className={getLinkClass('/dashboard/tickets')}
          >
            <Ticket className="w-4 h-4 shrink-0" />
            <span>Tickets</span>
          </Link>

          <Link
            title="Analytics"
            href="/dashboard/analytics"
            className={getLinkClass('/dashboard/analytics')}
          >
            <BarChart2 className="w-4 h-4 shrink-0" />
            <span>Analytics</span>
          </Link>
        </div>

        {/* AI & Config Section */}
        <div className="pt-4">
          <p className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest px-2 mb-2">Configuration</p>

          <Link
            title="AI Settings"
            href="/dashboard/ai"
            className={getLinkClass('/dashboard/ai')}
          >
            <Bot className="w-4 h-4 shrink-0" />
            <span>AI Settings</span>
          </Link>

          <Link
            title="Integrations"
            href="/dashboard/integrations"
            className={getLinkClass('/dashboard/integrations')}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span>Integrations</span>
          </Link>

          <Link
            title="Members"
            href="/dashboard/members"
            className={getLinkClass('/dashboard/members')}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Members</span>
          </Link>
        </div>
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-5 space-y-1.5 shrink-0 w-full">
        <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 space-y-1">
          <Link
            title="Settings"
            href="/settings"
            className={getLinkClass('/settings', isSettingsActive)}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Settings</span>
          </Link>
          <div title="Appearance" className="flex items-center gap-2.5 w-full py-1.5 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-405 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/40 transition-all mb-1.5 border border-transparent px-2.5">
            <ThemeToggle />
            <span className="text-neutral-700 dark:text-neutral-300">Appearance</span>
          </div>
          <a
            title="Sign Out"
            href="/api/auth/logout"
            className="flex items-center gap-2.5 w-full py-2.5 rounded-lg text-sm font-semibold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/15 transition-all border border-red-100 dark:border-red-500/20 px-2.5"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </a>
        </div>
      </div>
    </aside>
  );
}

export const DEFAULT_PLATFORMS = [
  { id: 'ALL', label: 'All Channels', icon: <Inbox className="w-4 h-4" /> },
  { id: 'WA', label: 'WhatsApp', icon: <WhatsAppIcon className="w-4 h-4 text-emerald-500" /> },
  { id: 'IG', label: 'Instagram', icon: <InstagramIcon className="w-4 h-4 text-pink-500" /> },
  { id: 'FB', label: 'Facebook', icon: <FacebookIcon className="w-4 h-4 text-blue-500" /> },
  { id: 'TELEGRAM', label: 'Telegram', icon: <TelegramIcon className="w-4 h-4 text-sky-500" /> },
  { id: 'TIKTOK', label: 'TikTok', icon: <TikTokIcon className="w-4 h-4 text-neutral-700 dark:text-neutral-300" /> },
];
