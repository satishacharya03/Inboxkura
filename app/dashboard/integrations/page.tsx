'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import {
  Search, Bot, CheckCircle2, Circle, AlertCircle, PlugZap, Unplug,
  Loader2, ArrowUpRight, HelpCircle, Inbox, Menu, Wifi, WifiOff, Sparkles
} from 'lucide-react';
import {
  PlatformIcon, InstagramIcon, FacebookIcon, WhatsAppIcon,
  TikTokIcon, TelegramIcon, GmailIcon, OutlookIcon
} from '@/app/dashboard/components/dashboard-ui';
import { LeftSidebar, DEFAULT_PLATFORMS } from '@/app/dashboard/components/LeftSidebar';
import { CustomApiSettings } from './components/CustomApiSettings';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

type ConfigItem = {
  id: string;
  platform: string;
  pageId: string | null;
  connectedName: string | null;
  connectedEmail: string | null;
  connectedAvatar: string | null;
};

type PlatformStatus = {
  orgId: string;
  role: string;
  FB: boolean;
  IG: boolean;
  WA: boolean;
  TIKTOK: boolean;
  TELEGRAM: boolean;
  configs?: ConfigItem[];
  error?: string;
};

type IntegrationItem = {
  id: string;
  name: string;
  shortName: string;
  icon: React.ReactNode;
  category: 'MESSAGING' | 'ECOMMERCE';
  description: string;
  docsUrl: string;
  color: string;
  bgGradient: string;
};

const INTEGRATIONS: IntegrationItem[] = [
  {
    id: 'IG',
    name: 'Instagram',
    shortName: 'IG',
    category: 'MESSAGING',
    icon: <InstagramIcon className="w-5 h-5 text-pink-500" />,
    description: 'Manage Direct Messages, comments and story mentions from your omnichannel inbox.',
    docsUrl: '/docs/connection#ig',
    color: 'from-pink-500 to-rose-500',
    bgGradient: 'from-pink-500/10 via-rose-500/5 to-transparent',
  },
  {
    id: 'FB',
    name: 'Facebook Messenger',
    shortName: 'FB',
    category: 'MESSAGING',
    icon: <FacebookIcon className="w-5 h-5 text-blue-500" />,
    description: 'Connect your Facebook Page to manage Messenger conversations directly from your inbox.',
    docsUrl: '/docs/connection#fb',
    color: 'from-blue-500 to-indigo-500',
    bgGradient: 'from-blue-500/10 via-indigo-500/5 to-transparent',
  },
  {
    id: 'WA',
    name: 'WhatsApp',
    shortName: 'WA',
    category: 'MESSAGING',
    icon: <WhatsAppIcon className="w-5 h-5 text-emerald-500" />,
    description: 'Connect your WhatsApp Business Cloud API to handle customer chats at scale.',
    docsUrl: '/docs/connection#wa',
    color: 'from-emerald-500 to-teal-500',
    bgGradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
  },
  {
    id: 'TIKTOK',
    name: 'TikTok',
    shortName: 'TT',
    category: 'MESSAGING',
    icon: <TikTokIcon className="w-5 h-5 text-neutral-800 dark:text-white" />,
    description: 'Map TikTok webhook events into the shared inbox to reply to customer TikTok messages.',
    docsUrl: '/docs/connection#tiktok',
    color: 'from-neutral-700 to-neutral-500',
    bgGradient: 'from-neutral-500/10 via-neutral-400/5 to-transparent',
  },
  {
    id: 'TELEGRAM',
    name: 'Telegram',
    shortName: 'TG',
    category: 'MESSAGING',
    icon: <TelegramIcon className="w-5 h-5 text-sky-500" />,
    description: 'Connect your personal Telegram account via Business Mode or Bot to manage messages.',
    docsUrl: '/docs/connection#telegram',
    color: 'from-sky-500 to-cyan-500',
    bgGradient: 'from-sky-500/10 via-cyan-500/5 to-transparent',
  },
  {
    id: 'GMAIL',
    name: 'Gmail',
    shortName: 'GM',
    category: 'MESSAGING',
    icon: <GmailIcon className="w-5 h-5" />,
    description: 'Connect your Google Workspace support email to receive and answer tickets.',
    docsUrl: '/docs',
    color: 'from-red-500 to-orange-500',
    bgGradient: 'from-red-500/10 via-orange-500/5 to-transparent',
  },
  {
    id: 'OUTLOOK',
    name: 'Outlook',
    shortName: 'OL',
    category: 'MESSAGING',
    icon: <OutlookIcon className="w-5 h-5" />,
    description: 'Sync your Microsoft Outlook support inbox into your shared dashboard.',
    docsUrl: '/docs',
    color: 'from-blue-600 to-blue-400',
    bgGradient: 'from-blue-600/10 via-blue-400/5 to-transparent',
  },
  {
    id: 'CUSTOM',
    name: 'Custom API & Webhooks',
    shortName: 'API',
    category: 'MESSAGING',
    icon: <PlugZap className="w-5 h-5 text-indigo-500" />,
    description: 'Use your own API key and webhooks to programmatically integrate your app.',
    docsUrl: '/docs/api',
    color: 'from-indigo-600 to-violet-600',
    bgGradient: 'from-indigo-600/10 via-violet-600/5 to-transparent',
  },
];

function IntegrationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: status, mutate: mutateStatus } = useSWR<PlatformStatus>('/api/platforms', fetcher);
  const { data: orgData, mutate: mutateOrgs } = useSWR('/api/orgs', fetcher);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('IG');
  const [search, setSearch] = useState('');
  const [telegramBizId, setTelegramBizId] = useState('');
  const [isSavingBiz, setIsSavingBiz] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  useEffect(() => {
    if (status && !status.error) {
      const tgConfig = status.configs?.find(c => c.platform === 'TELEGRAM');
      if (tgConfig) setTelegramBizId(tgConfig.pageId || '');
    }
  }, [status]);

  // Load Facebook SDK
  useEffect(() => {
    window.fbAsyncInit = function() {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v19.0'
      });
    };

    (function(d, s, id) {
      let js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {return;}
      js = d.createElement(s) as HTMLScriptElement; js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode?.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }, []);

  // Listen for Embedded Signup postMessage events
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!event.origin.endsWith('facebook.com')) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'WA_EMBEDDED_SIGNUP') {
          // Send to backend
          setLoadingId('WA');
          const res = await fetch('/api/auth/meta/embedded-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_data: data,
              orgId: orgData?.activeOrgId,
            }),
          });
          const result = await res.json();
          if (result.success) {
            mutateStatus();
            alert('WhatsApp connected successfully!');
          } else {
            alert(result.error || 'Failed to connect WhatsApp.');
          }
          setLoadingId(null);
        }
      } catch (e) {
        // ignore non-json messages
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [orgData?.orgId, mutateStatus]);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      alert(`Integration Error: ${decodeURIComponent(errorParam)}`);
      // Clean up the URL
      router.replace('/dashboard/integrations');
    }
  }, [searchParams, router]);

  const activeIntegration = INTEGRATIONS.find(i => i.id === selectedId) || INTEGRATIONS[0];
  const isConnected = status ? !!(status as any)[activeIntegration.id] : false;
  const config = status?.configs?.find(c => c.platform === activeIntegration.id);
  const isAdmin = status?.role === 'ADMIN' || status?.role === 'OWNER';

  const connectedCount = useMemo(() => {
    if (!status) return 0;
    let count = 0;
    if (status.FB) count++;
    if (status.IG) count++;
    if (status.WA) count++;
    if (status.TIKTOK) count++;
    if (status.TELEGRAM) count++;
    return count;
  }, [status]);

  const filteredIntegrations = INTEGRATIONS.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDisconnect = async (platformId: string) => {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to disconnect ${platformId}? This will stop receiving messages from that platform.`)) return;

    setLoadingId(platformId);
    try {
      const res = await fetch(`/api/platforms?platform=${platformId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        mutateStatus();
      } else {
        alert(data.error || 'Failed to disconnect');
      }
    } catch {
      alert('Network error — could not disconnect.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleSaveManualId = async (platformId: 'TELEGRAM' | 'WA', pageId: string) => {
    if (!pageId.trim() || !isAdmin) return;
    setIsSavingBiz(true);
    try {
      const res = await fetch('/api/platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformId, pageId })
      });
      const data = await res.json();
      if (data.success) {
        mutateStatus();
        alert(`${platformId} connection ID updated!`);
      } else {
        alert(data.error || 'Failed to update');
      }
    } catch {
      alert('Network error — could not save.');
    } finally {
      setIsSavingBiz(false);
    }
  };

  const handleWhatsAppConnect = () => {
    if (!window.FB) {
      alert('Facebook SDK not loaded. Please disable ad-blockers and try again.');
      return;
    }
    const configId = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID || '';
    window.FB.login(
      (response: any) => {
        if (response.authResponse && response.authResponse.code) {
          // Code received. We might also get event messages.
          // Wait for the postMessage WA_EMBEDDED_SIGNUP event or manually send code to backend.
          // Our message event listener handles WA_EMBEDDED_SIGNUP if it arrives.
          // We can also trigger a backend call here with just the code if we want fallback.
          setLoadingId('WA');
          fetch('/api/auth/meta/embedded-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: response.authResponse.code,
              orgId: orgData?.activeOrgId,
            }),
          }).then(res => res.json()).then(result => {
             setLoadingId(null);
             if (result.success) {
               mutateStatus();
               // We don't alert here because we might get two alerts if postMessage also fires.
               // Actually, if postMessage fires, it might be faster.
               // So let's rely mainly on this fetch, because `code` is what we really need for token exchange.
             } else {
               if (result.error !== 'Already handled via event') {
                  alert(result.error || 'Failed to connect WhatsApp.');
               }
             }
          }).catch(() => {
             setLoadingId(null);
          });
        } else {
          alert('Facebook login failed or was cancelled.');
        }
      },
      {
        config_id: configId || undefined,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: configId ? 'whatsapp_business_app_onboarding' : 'whatsapp_business_management',
          sessionInfoVersion: '3',
        },
      }
    );
  };


  return (
    <div
      className="flex h-[100dvh] w-[100dvw] overflow-hidden bg-background text-foreground"
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
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl px-4 md:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarExpanded(prev => !prev)}
              className="md:hidden p-2 -ml-1 rounded-lg hover:bg-muted text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold tracking-tight text-foreground">Integrations</span>
            </div>
          </div>

          {/* Channel Progress - Desktop only */}
          <div className="hidden md:flex items-center gap-3 bg-surface/60 border border-border rounded-xl px-4 py-2">
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs font-bold text-foreground">{connectedCount}/5</span>
              <span className="text-xs text-muted-foreground">channels active</span>
            </div>
            <div className="w-20 bg-muted h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${(connectedCount / 5) * 100}%` }}
              />
            </div>
          </div>
        </header>

        {/* ── MOBILE: Horizontal pill picker + details below ── */}
        {/* ── DESKTOP: Side pane + main pane ── */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

          {/* ─── MOBILE PILL ROW / DESKTOP LIST PANEL ─── */}
          <div className="md:w-72 md:border-r md:border-border md:flex-col md:shrink-0 flex-col flex">
            {/* Mobile: Horizontal Scroll, Desktop: Search + list */}
            <div className="md:hidden border-b border-border bg-background/60 backdrop-blur-sm py-3">
              {/* Mobile channel progress */}
              <div className="flex items-center gap-2 px-4 mb-3">
                <div className="flex-1 bg-muted h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${(connectedCount / 5) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">{connectedCount}/5 active</span>
              </div>

              {/* Horizontal scrollable integration pills */}
              <div className="flex gap-2.5 px-4 overflow-x-auto scrollbar-none pb-1" style={{ scrollbarWidth: 'none' }}>
                {filteredIntegrations.map(i => {
                  const active = i.id === selectedId;
                  const connected = status ? !!(status as any)[i.id] : false;
                  return (
                    <button
                      key={i.id}
                      onClick={() => setSelectedId(i.id)}
                      className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl border transition-all duration-200 ${
                        active
                          ? 'bg-indigo-600/15 border-indigo-500/40 shadow-sm shadow-indigo-500/20'
                          : 'bg-surface/60 border-border/60 hover:border-border'
                      }`}
                    >
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          active ? `bg-gradient-to-br ${i.bgGradient} border border-white/10` : 'bg-muted/60'
                        }`}>
                          {i.icon}
                        </div>
                        {connected && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background shadow shadow-emerald-500/50 animate-pulse" />
                        )}
                      </div>
                      <span className={`text-[10px] font-bold whitespace-nowrap ${
                        active ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground'
                      }`}>
                        {i.id === 'FB' ? 'Messenger' : i.id === 'TIKTOK' ? 'TikTok' : i.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Desktop: Search + List */}
            <div className="hidden md:flex flex-col flex-1 overflow-hidden">
              <div className="p-4 border-b border-border space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search integrations..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8.5 pr-4 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-3 py-2">Messaging Channels</p>
                {filteredIntegrations
                  .filter(i => i.category === 'MESSAGING')
                  .map(i => {
                    const active = i.id === selectedId;
                    const connected = status ? !!(status as any)[i.id] : false;
                    return (
                      <button
                        key={i.id}
                        onClick={() => setSelectedId(i.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                          active
                            ? 'bg-indigo-600/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                          active ? `bg-gradient-to-br ${i.bgGradient} border border-white/10` : 'bg-muted/50'
                        }`}>
                          {i.icon}
                        </div>
                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <span className="truncate w-full text-left">{i.name}</span>
                          {i.id === 'TIKTOK' && (
                            <span className="text-[8px] text-amber-600 dark:text-amber-400 font-medium">Waiting for approval</span>
                          )}
                          {['GMAIL', 'OUTLOOK'].includes(i.id) && (
                            <span className="text-[8px] text-muted-foreground/70 font-medium">Coming soon</span>
                          )}
                        </div>
                        {connected && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow shadow-emerald-500/50 animate-pulse shrink-0" />
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* ─── DETAILS PANEL ─── */}
          <main className="flex-1 overflow-y-auto">
            {/* Hero card with integration details */}
            <div className={`relative overflow-hidden bg-gradient-to-br ${activeIntegration.bgGradient} border-b border-border`}>
              <div className="p-5 md:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Icon + Name */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${activeIntegration.color} flex items-center justify-center shadow-xl shrink-0`}>
                    <div className="text-white scale-125">{activeIntegration.icon}</div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h1 className="text-lg md:text-2xl font-black text-foreground tracking-tight">
                        {activeIntegration.name}
                      </h1>
                      {isConnected && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      )}
                      {activeIntegration.id === 'TIKTOK' && !isConnected && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                          Pending Approval
                        </span>
                      )}
                      {['GMAIL', 'OUTLOOK'].includes(activeIntegration.id) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-neutral-500/15 border border-neutral-500/30 text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
                      {activeIntegration.description}
                    </p>
                  </div>

                  {/* Action button */}
                  <div className="shrink-0 mt-1">
                    {isAdmin ? (
                      <>
                        {isConnected ? (
                          <button
                            onClick={() => handleDisconnect(activeIntegration.id)}
                            disabled={loadingId === activeIntegration.id}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 hover:border-rose-500/50 text-rose-600 dark:text-rose-400 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {loadingId === activeIntegration.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Unplug className="w-4 h-4" />
                            )}
                            Disconnect
                          </button>
                        ) : (
                          ['FB', 'IG', 'WA', 'TIKTOK', 'TELEGRAM'].includes(activeIntegration.id) ? (
                            activeIntegration.id === 'WA' ? (
                              <button
                                onClick={handleWhatsAppConnect}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r ${activeIntegration.color} text-white text-xs font-bold transition-all shadow-lg hover:opacity-90 hover:shadow-xl cursor-pointer`}
                              >
                                <PlugZap className="w-4 h-4" />
                                Connect
                              </button>
                            ) : (
                              <a
                                href={
                                  activeIntegration.id === 'TELEGRAM'
                                    ? `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'InboxKuraBot'}?start=auth`
                                    : activeIntegration.id === 'TIKTOK'
                                    ? '/api/auth/tiktok'
                                    : `/api/auth/meta?platform=${activeIntegration.id}`
                                }
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r ${activeIntegration.color} text-white text-xs font-bold transition-all shadow-lg hover:opacity-90 hover:shadow-xl`}
                              >
                                <PlugZap className="w-4 h-4" />
                                Connect
                              </a>
                            )
                          ) : ['GMAIL', 'OUTLOOK', 'CUSTOM'].includes(activeIntegration.id) ? (
                            <button
                              disabled={activeIntegration.id !== 'CUSTOM'}
                              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl ${activeIntegration.id === 'CUSTOM' ? 'bg-gradient-to-r ' + activeIntegration.color + ' text-white shadow-lg hover:opacity-90' : 'bg-muted border border-border text-muted-foreground cursor-not-allowed opacity-60'} text-xs font-semibold`}
                            >
                              {activeIntegration.id === 'CUSTOM' ? 'See Details Below' : 'Coming Soon'}
                            </button>
                          ) : null
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Admin access required</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content sections */}
            <div className="p-5 md:p-8 space-y-5">

              {/* Connection details - when connected */}
              {isConnected && config && (
                <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border bg-emerald-500/5">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                      <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Connection Details</h3>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-4 bg-background/60 border border-border rounded-xl p-4 max-w-sm">
                      {config.connectedAvatar ? (
                        <img
                          src={config.connectedAvatar}
                          alt={config.connectedName || 'Profile'}
                          className="w-12 h-12 rounded-xl object-cover border border-border shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${activeIntegration.color} text-white font-bold flex items-center justify-center shrink-0 text-sm`}>
                          {(config.connectedName || activeIntegration.name)[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{config.connectedName || 'Connected Page'}</p>
                        {config.connectedEmail && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{config.connectedEmail}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground font-mono mt-1 select-all bg-muted px-2 py-0.5 rounded border border-border inline-block">
                          ID: {config.pageId}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Config ID fields for Telegram */}
              {['TELEGRAM'].includes(activeIntegration.id) && (
                <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Telegram Configuration
                    </h3>
                  </div>
                  <div className="p-5">
                    <div className="space-y-2 max-w-md">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                        Telegram Business Connection ID
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={telegramBizId}
                          onChange={(e) => setTelegramBizId(e.target.value)}
                          disabled={!isAdmin}
                          placeholder="e.g. conn_123456789"
                          className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-indigo-500/50 transition-colors disabled:opacity-50"
                        />
                        {isAdmin && (
                          <button
                            onClick={() => handleSaveManualId('TELEGRAM', telegramBizId)}
                            disabled={isSavingBiz}
                            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50 shrink-0 cursor-pointer shadow-sm"
                          >
                            {isSavingBiz ? 'Saving...' : 'Save'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Messaging policy for Instagram */}
              {activeIntegration.id === 'IG' && (
                <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-indigo-500/15">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Messaging Policy</h3>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="bg-indigo-500/8 border border-indigo-500/15 rounded-xl p-4 space-y-2.5">
                      <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-indigo-500" />
                        The 24-hour rule
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Instagram allows replies <span className="text-indigo-600 dark:text-indigo-300 font-bold">only within 24 hours</span> of the customer's last message.
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1.5 list-none pl-0">
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <span><span className="text-emerald-500 font-bold">Within 24h</span>: Full unrestricted conversation — text, images, attachments.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 mt-1.5 shrink-0" />
                          <span><span className="font-bold text-muted-foreground">After 24h</span>: Wait for the customer to reply again to re-open the window.</span>
                        </li>
                      </ul>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60">
                      Standard Meta Platform policy.{' '}
                      <a href="https://developers.facebook.com/docs/messenger-platform/policy/policy-overview/" target="_blank" rel="noreferrer" className="text-indigo-500/80 hover:text-indigo-400 underline">
                        Learn more
                      </a>
                    </p>
                  </div>
                </div>
              )}

              {/* Custom API Settings */}
              {activeIntegration.id === 'CUSTOM' && (
                <CustomApiSettings isAdmin={isAdmin} />
              )}

              {/* Setup Guide */}
              <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-sm p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Connection Setup Guide</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
                    Read step-by-step documentation to configure and authorize this channel.
                  </p>
                </div>
                {activeIntegration.docsUrl.startsWith('/') ? (
                  <Link
                    href={activeIntegration.docsUrl}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-all shrink-0 group cursor-pointer"
                  >
                    Read Docs
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </Link>
                ) : (
                  <a
                    href={activeIntegration.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-all shrink-0 group cursor-pointer"
                  >
                    Read Docs
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                )}
              </div>

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>}>
      <IntegrationsContent />
    </Suspense>
  );
}
