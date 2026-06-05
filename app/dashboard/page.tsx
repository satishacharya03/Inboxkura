"use client";

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import useSWR from 'swr';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  MessageCircle, Settings, Send, Sparkles, RefreshCw, Check,
  PanelRightClose, PanelRightOpen, AlertCircle, Building2,
  MoreVertical, Copy, Reply, Smile, Trash2, Trash, X, Bot,
  Play, ExternalLink, ChevronLeft, Menu, LogOut, Loader2, User, UserPlus,
} from 'lucide-react';
import { LeftSidebar, DEFAULT_PLATFORMS } from './components/LeftSidebar';
import { MessageListPane } from './components/MessageListPane';
import { RightSidebarPane } from './components/RightSidebarPane';
import { Contact, Message, OrgData, Sentiment } from './components/dashboard-types';
import { formatDateTime, PlatformIcon, platformLabel, SentimentBadge, SafeAvatar } from './components/dashboard-ui';
import { getLocalAgentChat, saveLocalAgentChat, getLocalMessageAi, saveLocalMessageAi, type MessageAiInsight } from '@/lib/localdb';
import { useWebSocket } from '@/hooks/useWebSocket';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

const LEFT_NAV_MIN_PX    = 200;
const LEFT_NAV_DEFAULT_PX   = 200;
const MESSAGE_LIST_MIN_PX  = 280;
const MESSAGE_LIST_DEFAULT_PX = 280;
const RIGHT_PANE_MIN_PX  = 300;
const RIGHT_PANE_DEFAULT_PX = 350;

// ── Platform unsend-for-everyone time limits (minutes, null = no limit) ─────
const UNSEND_LIMIT_MINUTES: Record<string, number | null> = {
  FB:       10,    // Facebook Messenger: 10 minutes hard limit
  IG:       null,  // Instagram DMs: no time limit
  WA:       2880,  // WhatsApp: 48 hours
  TELEGRAM: null,  // Telegram: no limit
  TIKTOK:   null,  // TikTok: no limit
};

const PLATFORM_LABELS: Record<string, string> = {
  FB: 'Facebook (10 min window)',
  IG: 'Instagram (no time limit)',
  WA: 'WhatsApp (48 h window)',
  TELEGRAM: 'Telegram (no time limit)',
  TIKTOK: 'TikTok (no time limit)',
};

function getUnsendStatus(timestamp: string, platform: string) {
  const limit   = UNSEND_LIMIT_MINUTES[platform] ?? null;
  const elapsed = (Date.now() - new Date(timestamp).getTime()) / 60000; // minutes
  const remaining = limit ? Math.max(0, limit - elapsed) : Infinity;
  return {
    canUnsendForEveryone: limit === null || elapsed <= limit,
    limitMinutes: limit,
    elapsedMinutes: elapsed,
    remainingMinutes: remaining,
    platformLabel: PLATFORM_LABELS[platform] ?? platform,
  };
}

function fmtRemaining(mins: number): string {
  if (!isFinite(mins)) return '';
  if (mins < 1) return `${Math.ceil(mins * 60)}s left`;
  if (mins < 60) return `${Math.floor(mins)}m left`;
  return `${Math.floor(mins / 60)}h ${Math.floor(mins % 60)}m left`;
}

function isPlaceholderText(text?: string | null, hasMedia?: boolean): boolean {
  if (!text || !hasMedia) return false;
  const t = text.trim().toLowerCase();
  return (
    t === 'sent a photo' ||
    t === 'sent a voice message' ||
    t === 'sent a video' ||
    t === 'sent a reel/video' ||
    t === 'sent a reels' ||
    t === 'sent a message'
  );
}

// ── Quick emojis ────────────────────────────────────────────────────────────
const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '👏', '🔥'];

// ── Unsend Modal ─────────────────────────────────────────────────────────────
function UnsendModal({
  msg,
  onUnsendForMe,
  onUnsendForEveryone,
  onCancel,
  loading,
}: {
  msg: Message;
  onUnsendForMe: () => void;
  onUnsendForEveryone: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const status = getUnsendStatus(msg.timestamp, msg.platform);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-0.5">Unsend Message</h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Platform rule: <span className="font-medium text-neutral-700 dark:text-neutral-300">{status.platformLabel}</span>
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-5">
          {/* Unsend for me — always available */}
          <button
            onClick={onUnsendForMe}
            disabled={loading}
            className="w-full flex items-start gap-3 p-4 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all group text-left disabled:opacity-50"
          >
            {loading
              ? <RefreshCw className="w-5 h-5 mt-0.5 text-indigo-500 animate-spin shrink-0" />
              : <Trash2 className="w-5 h-5 mt-0.5 text-neutral-400 group-hover:text-indigo-500 transition-colors shrink-0" />
            }
            <div>
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                Unsend for me
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                Removes the message from your inbox only. The customer still sees it on their end.
              </p>
            </div>
          </button>

          {/* Unsend for everyone — platform time-gated */}
          <button
            onClick={onUnsendForEveryone}
            disabled={loading || !status.canUnsendForEveryone}
            className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all group text-left ${
              status.canUnsendForEveryone
                ? 'border-neutral-200 dark:border-neutral-700 hover:border-red-400 dark:hover:border-red-500 hover:bg-red-50/50 dark:hover:bg-red-500/5 disabled:opacity-50'
                : 'border-neutral-200/60 dark:border-neutral-700/60 opacity-50 cursor-not-allowed'
            }`}
          >
            {loading
              ? <RefreshCw className="w-5 h-5 mt-0.5 text-red-500 animate-spin shrink-0" />
              : <Trash2 className={`w-5 h-5 mt-0.5 shrink-0 transition-colors ${
                  status.canUnsendForEveryone
                    ? 'text-neutral-400 group-hover:text-red-500'
                    : 'text-neutral-300 dark:text-neutral-600'
                }`} />
            }
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-xs font-semibold transition-colors ${
                  status.canUnsendForEveryone
                    ? 'text-neutral-800 dark:text-neutral-200 group-hover:text-red-700 dark:group-hover:text-red-300'
                    : 'text-neutral-400 dark:text-neutral-600'
                }`}>
                  Unsend for everyone
                </p>
                {/* Live countdown badge */}
                {status.canUnsendForEveryone && isFinite(status.remainingMinutes) && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                    {fmtRemaining(status.remainingMinutes)}
                  </span>
                )}
                {!status.canUnsendForEveryone && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                    Window expired
                  </span>
                )}
              </div>
              <p className={`text-[11px] mt-0.5 leading-relaxed ${
                status.canUnsendForEveryone
                  ? 'text-neutral-500 dark:text-neutral-400'
                  : 'text-neutral-400 dark:text-neutral-600'
              }`}>
                {status.canUnsendForEveryone
                  ? 'Removes the message for both you and the customer.'
                  : status.limitMinutes
                    ? `The ${status.limitMinutes < 60 ? `${status.limitMinutes}-minute` : `${Math.floor(status.limitMinutes / 60)}-hour`} window has passed. You can only unsend for yourself now.`
                    : 'No longer available.'
                }
              </p>
            </div>
          </button>
        </div>

        <button
          onClick={onCancel}
          disabled={loading}
          className="w-full px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal (hard-delete by admin/owner) ───────────────────
function DeleteModal({
  title, description, onConfirm, onCancel, loading,
}: {
  title: string; description: string;
  onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{title}</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <button onClick={onCancel} disabled={loading}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-500/20 transition-all disabled:opacity-50">
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Message Context Menu ─────────────────────────────────────────────────────
type MenuAction = 'copy' | 'reply' | 'emoji' | 'delete' | 'unsend';

function MessageContextMenu({
  msg, isOutbound, canDelete, onAction, onClose,
}: {
  msg: Message; isOutbound: boolean; canDelete: boolean;
  onAction: (action: MenuAction, payload?: string) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [placement, setPlacement] = useState<'down' | 'up'>('down');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    // If less than 100px remains below or it cuts off, check if there is space above
    if (spaceBelow < 100 && rect.top > rect.height) {
      setPlacement('up');
    }
  }, []);

  return (
    <div
      ref={ref}
      className={`absolute z-50 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md border border-neutral-200/60 dark:border-neutral-700/60 rounded-xl shadow-lg py-1 min-w-[136px] ${
        placement === 'up' ? 'bottom-0' : 'top-0'
      } ${
        isOutbound ? 'right-full mr-1.5' : 'left-full ml-1.5'
      }`}
    >
      {showEmojis ? (
        <div className="flex items-center gap-1 px-2 py-1">
          {QUICK_EMOJIS.map(e => (
            <button key={e} onClick={() => { onAction('emoji', e); onClose(); }}
              className="text-base hover:scale-125 transition-transform leading-none">{e}</button>
          ))}
          <button onClick={() => setShowEmojis(false)} className="ml-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <>
          <button onClick={() => setShowEmojis(true)}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50/80 dark:hover:bg-neutral-700/50 transition-colors">
            <Smile className="w-3 h-3 text-neutral-400" />
            React
          </button>
          <button onClick={() => { onAction('reply'); onClose(); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50/80 dark:hover:bg-neutral-700/50 transition-colors">
            <Reply className="w-3 h-3 text-neutral-400" />
            Reply
          </button>
          <button onClick={() => { onAction('copy'); onClose(); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50/80 dark:hover:bg-neutral-700/50 transition-colors">
            <Copy className="w-3 h-3 text-neutral-400" />
            Copy text
          </button>

          {/* Unsend — outbound messages only, opens platform-aware UnsendModal */}
          {isOutbound && (
            <>
              <div className="h-px bg-neutral-100/60 dark:bg-neutral-700/60 mx-2 my-0.5" />
              <button onClick={() => { onAction('unsend'); onClose(); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50/80 dark:hover:bg-orange-500/10 transition-colors">
                <Trash2 className="w-3 h-3" />
                Unsend
              </button>
            </>
          )}

          {/* Delete — ADMIN/OWNER only, inbound messages only */}
          {canDelete && !isOutbound && (
            <>
              <div className="h-px bg-neutral-100/60 dark:bg-neutral-700/60 mx-2 my-0.5" />
              <button onClick={() => { onAction('delete'); onClose(); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3 h-3" />
                Delete message
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Quoted reply preview ─────────────────────────────────────────────────────
function QuotedReply({ msg, onClear }: { msg: Message; onClear: () => void }) {
  return (
    <div className="flex items-start gap-2 mb-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
      <div className="w-0.5 self-stretch bg-indigo-500 rounded-full shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">
          {msg.isOutbound ? 'You' : 'Customer'}
        </p>
        <p className="text-xs text-neutral-600 dark:text-neutral-300 truncate">{msg.text}</p>
      </div>
      <button onClick={onClear} className="shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Emoji reaction type ──────────────────────────────────────────────────────
type Reaction = { emoji: string; msgId: string };

// ── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [activePlatform, setActivePlatform] = useState<string>('ALL');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [sendError, setSendError] = useState('');
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const platformDragRef = useRef<HTMLDivElement>(null);

  const handlePlatformDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const slider = platformDragRef.current;
    if (!slider) return;
    slider.dataset.isDown = 'true';
    slider.dataset.startX = String(e.pageX - slider.offsetLeft);
    slider.dataset.scrollLeft = String(slider.scrollLeft);
  };

  const handlePlatformDragMouseLeave = () => {
    const slider = platformDragRef.current;
    if (!slider) return;
    slider.dataset.isDown = 'false';
  };

  const handlePlatformDragMouseUp = () => {
    const slider = platformDragRef.current;
    if (!slider) return;
    slider.dataset.isDown = 'false';
  };

  const handlePlatformDragMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const slider = platformDragRef.current;
    if (!slider || slider.dataset.isDown !== 'true') return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const startX = Number(slider.dataset.startX || 0);
    const scrollLeft = Number(slider.dataset.scrollLeft || 0);
    const walk = (x - startX) * 1.5;
    slider.scrollLeft = scrollLeft - walk;
  };

  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [agentChat, setAgentChat] = useState<{ role: 'user' | 'model', parts: [{ text: string }] }[]>([]);
  const [agentInput, setAgentInput] = useState('');
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const prevLatestMsgIdRef = useRef<string | null>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const [layoutWidth, setLayoutWidth] = useState(1440);

  // Screen size detector hook for premium mobile responsiveness
  useEffect(() => {
    let lastWidth = window.innerWidth;
    
    // Set initial state
    const initialMobile = lastWidth < 768;
    setIsMobile(initialMobile);
    if (initialMobile) {
      setIsRightOpen(false);
      setIsLeftOpen(false);
    } else {
      setIsLeftOpen(true);
    }

    const checkIsMobile = () => {
      const currentWidth = window.innerWidth;
      if (currentWidth === lastWidth) return; // ignore height-only resizes (keyboard)
      lastWidth = currentWidth;
      
      const mobile = currentWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsRightOpen(false); // keep chat view clean on first load/resize
        setIsLeftOpen(false);
      } else {
        setIsLeftOpen(true);
      }
    };
    
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Pagination & scrolling states/refs
  const [messagesLimit, setMessagesLimit] = useState(20);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef<number>(0);
  const prevScrollHeightRef = useRef<number>(0);
  const [isScrollingUp, setIsScrollingUp] = useState(false);
  const isInitialLoadRef = useRef<boolean>(true);

  const getMediaProxyUrl = (url: string | null | undefined) => {
    if (!url) return '';
    if (url.startsWith('http')) {
      return `/api/media-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const [activeAiInsight, setActiveAiInsight] = useState<MessageAiInsight | null>(null);
  const analyzingMsgIdsRef = useRef<Set<string>>(new Set());

  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const { data: cannedResponses } = useSWR<any>('/api/canned-responses', fetcher, { revalidateOnFocus: false });
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const [cannedSearch, setCannedSearch] = useState('');
  const [cannedSelectedIndex, setCannedSelectedIndex] = useState(0);

  // Load persistent AI Copilot Chat from IndexedDB whenever contact changes
  useEffect(() => {
    if (selectedContact) {
      getLocalAgentChat(selectedContact.id).then(savedChat => {
        if (savedChat) {
          // Deduplicate based on exact text content to clean up any past race-condition entries
          const seen = new Set<string>();
          const dedupedChat = savedChat.filter(msg => {
            const txt = msg.parts[0]?.text;
            if (!txt) return true;
            if (msg.role === 'model' && txt.includes("Customer's Core Intent:")) {
              if (seen.has(txt)) return false;
              seen.add(txt);
            }
            return true;
          });
          setAgentChat(dedupedChat);
        } else {
          setAgentChat([]);
        }
      });
    } else {
      setAgentChat([]);
    }
  }, [selectedContact]);

  // Persist AI Copilot Chat in IndexedDB whenever it changes
  useEffect(() => {
    if (selectedContact) {
      saveLocalAgentChat(selectedContact.id, agentChat);
    }
  }, [agentChat, selectedContact]);

  // Context menu
  const [openMenuMsgId, setOpenMenuMsgId] = useState<string | null>(null);
  const [replyToMsg, setReplyToMsg] = useState<Message | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Modals
  const [unsendModal, setUnsendModal] = useState<Message | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ type: 'message' | 'conversation'; msgId?: string } | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isTogglingAutoRespond, setIsTogglingAutoRespond] = useState(false);

  const handleToggleAutoRespond = async () => {
    if (!selectedContact || isTogglingAutoRespond) return;
    setIsTogglingAutoRespond(true);
    const targetState = !selectedContact.autoRespond;
    try {
      const res = await fetch(`/api/contacts/${selectedContact.id}/auto-respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: targetState }),
      });
      if (res.ok) {
        setSelectedContact({ ...selectedContact, autoRespond: targetState });
        mutateContacts();
      }
    } catch (err) {
      console.error("Failed to toggle auto-respond:", err);
    } finally {
      setIsTogglingAutoRespond(false);
    }
  };

  const { data: orgData, mutate: mutateOrgs } = useSWR<OrgData>('/api/orgs', fetcher, { revalidateOnFocus: false });
  const { data: platformsData } = useSWR<any>('/api/platforms', fetcher, { revalidateOnFocus: false });
  const { data: contactsData, error: contactsError, isLoading: contactsLoading, mutate: mutateContacts } = useSWR<Contact[]>(
    `/api/contacts?platform=${activePlatform}`, fetcher
  );
  const { data: messagesData, mutate: mutateMessages, isValidating: isValidatingMessages } = useSWR<Message[]>(
    selectedContact ? `/api/messages?contactId=${selectedContact.id}&limit=${messagesLimit}` : null,
    fetcher
  );

  // Initialize real-time WebSocket connection to receive live message events
  useWebSocket(orgData?.activeOrgId, selectedContact?.id);

  const contacts = Array.isArray(contactsData) ? contactsData : [];
  const conversationMessages = Array.isArray(messagesData) ? messagesData : [];

  // Derive role for delete gating
  const currentUserRole = orgData?.orgs.find(o => o.orgId === orgData.activeOrgId)?.role ?? null;
  const canDelete = currentUserRole === 'ADMIN' || currentUserRole === 'OWNER';

  useEffect(() => {
    const node = layoutRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setLayoutWidth(Math.max(entry.contentRect.width, 1)));
    observer.observe(node);
    setLayoutWidth(Math.max(node.getBoundingClientRect().width, 1));
    return () => observer.disconnect();
  }, []);

  const getFirstSuggestedReply = (s: string | null) => {
    if (!s) return '';
    try {
      const p = JSON.parse(s);
      if (p && typeof p === 'object' && 'replies' in p) {
        return Array.isArray(p.replies) && p.replies.length > 0 ? p.replies[0] : '';
      }
      return Array.isArray(p) && p.length > 0 ? p[0] : s;
    } catch { return s; }
  };

  const filtered = contacts.filter(c => {
    if (!c.messages || c.messages.length === 0) return false;
    
    // Status Filter
    const contactStatus = (c as any).status || 'ACTIVE';
    if (contactStatus !== statusFilter) return false;

    // Search Query
    if (searchQuery) {
      return (
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.platformId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.messages[0]?.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  const getOrExtractMessageAiInsight = async (msg: Message): Promise<MessageAiInsight | null> => {
    if (!msg) return null;
    
    // First, check IndexedDB
    const cached = await getLocalMessageAi(msg.id);
    if (cached) return cached;

    // Third, return null if not in IndexedDB
    return null;

    return null;
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setMessagesLimit(20);
    isInitialLoadRef.current = true;
    prevMessagesLengthRef.current = 0;
    setIsScrollingUp(false);

    const lastMsg = contact.messages[0] || null;
    setSelectedMessage(lastMsg);
    setReplyText('');
    setActiveAiInsight(null);
    if (lastMsg) {
      getOrExtractMessageAiInsight(lastMsg).then(insight => {
        if (insight) {
          setActiveAiInsight(insight);
        }
      });
    }
    setSendState('idle');
    setSendError('');
    setReplyToMsg(null);
    setOpenMenuMsgId(null);
    if (!isRightOpen) setIsRightOpen(true);
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Load older messages if user scrolls to the top (scrollTop < 20)
    if (container.scrollTop < 20) {
      if (conversationMessages.length >= messagesLimit) {
        // Capture BOTH scrollHeight AND scrollTop before the state change
        prevScrollHeightRef.current = container.scrollHeight;
        setIsScrollingUp(true);
        setMessagesLimit(prev => prev + 20);
      }
    }
  };

  // Scroll management for infinite scroll and new messages
  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const currentLength = conversationMessages.length;
    const prevLength = prevMessagesLengthRef.current;

    if (currentLength !== prevLength) {
      if (isInitialLoadRef.current) {
        // On first load, scroll to bottom
        container.scrollTop = container.scrollHeight;
        isInitialLoadRef.current = false;
        setIsScrollingUp(false);
      } else if (isScrollingUp) {
        // Reverse scroll: preserve viewport position relative to the old scroll height
        // New scroll position = new total height - old total height + old scroll position
        const newScrollHeight = container.scrollHeight;
        const diff = newScrollHeight - prevScrollHeightRef.current;
        // diff is the height added by the new messages at the top
        container.scrollTop = diff;
        setIsScrollingUp(false);
      } else if (currentLength > prevLength) {
        // New message arrived from the bottom — scroll to bottom smoothly
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
      prevMessagesLengthRef.current = currentLength;
    }
  }, [conversationMessages, isScrollingUp]);

  // Reset scroll state on contact switch
  useEffect(() => {
    if (selectedContact) {
      setMessagesLimit(20);
      isInitialLoadRef.current = true;
      prevMessagesLengthRef.current = 0;
      setIsScrollingUp(false);
    }
  }, [selectedContact]);

  const handleSelectMessage = (msg: Message) => {
    setSelectedMessage(msg);
    setReplyText('');
    setActiveAiInsight(null);
    getOrExtractMessageAiInsight(msg).then(insight => {
      if (insight) {
        setActiveAiInsight(insight);
      }
    });
    if (!isRightOpen) setIsRightOpen(true);
  };

  // ── Context menu handler ─────────────────────────────────────────────────
  const handleMenuAction = useCallback((action: MenuAction, msg: Message, payload?: string) => {
    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(msg.text);
        setCopiedMsgId(msg.id);
        setTimeout(() => setCopiedMsgId(null), 2000);
        break;
      case 'reply':
        setReplyToMsg(msg);
        textareaRef.current?.focus();
        break;
      case 'emoji':
        if (payload) {
          const alreadyReacted = reactions.some(r => r.msgId === msg.id && r.emoji === payload) || msg.reaction === payload;
          const targetEmoji = alreadyReacted ? null : payload;

          // Optimistic local state update
          setReactions(prev => {
            if (alreadyReacted) return prev.filter(r => r.msgId !== msg.id);
            return [...prev.filter(r => r.msgId !== msg.id), { emoji: payload, msgId: msg.id }];
          });

          // Sync with database & Meta
          fetch(`/api/messages/${msg.id}/react`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji: targetEmoji }),
          }).then(res => {
            if (res.ok) mutateMessages();
          }).catch(console.error);
        }
        break;
      case 'unsend':
        setUnsendModal(msg); // full msg needed for platform time check
        break;
      case 'delete':
        setDeleteModal({ type: 'message', msgId: msg.id });
        break;
    }
  }, []);

  // ── Unsend handlers ──────────────────────────────────────────────────────
  const callDeleteApi = async (msgId: string) => {
    const res = await fetch(`/api/messages/${msgId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error);
  };

  const handleUnsendForMe = async () => {
    if (!unsendModal) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/messages/${unsendModal.id}/unsend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'me' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to unsend message');

      mutateMessages();
      if (selectedMessage?.id === unsendModal.id) setSelectedMessage(null);
    } catch (e) {
      console.error('Unsend for me:', e);
      alert(e instanceof Error ? e.message : 'Failed to unsend message');
    } finally {
      setIsDeleting(false);
      setUnsendModal(null);
    }
  };

  const handleUnsendForEveryone = async () => {
    if (!unsendModal) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/messages/${unsendModal.id}/unsend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'everyone' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to unsend message for everyone');

      if (data.localOnly) {
        alert(data.message || 'Removed from your inbox, but platform unsend was skipped.');
      }

      mutateMessages();
      mutateContacts();
      if (selectedMessage?.id === unsendModal.id) setSelectedMessage(null);
    } catch (e) {
      console.error('Unsend for everyone:', e);
      alert(e instanceof Error ? e.message : 'Failed to unsend message for everyone');
    } finally {
      setIsDeleting(false);
      setUnsendModal(null);
    }
  };

  // ── Hard delete handler ──────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteModal) return;
    setIsDeleting(true);
    try {
      if (deleteModal.type === 'message' && deleteModal.msgId) {
        await callDeleteApi(deleteModal.msgId);
        mutateMessages();
        if (selectedMessage?.id === deleteModal.msgId) setSelectedMessage(null);
      } else if (deleteModal.type === 'conversation' && selectedContact) {
        const res = await fetch(`/api/messages?contactId=${selectedContact.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error((await res.json()).error);
        mutateMessages();
        mutateContacts();
        setSelectedMessage(null);
      }
    } catch (e) { console.error('Delete:', e); }
    finally { setIsDeleting(false); setDeleteModal(null); }
  };

  const handleSend = async () => {
    if (!selectedMessage || !replyText.trim() || sendState === 'sending') return;
    setSendState('sending');
    setSendError('');
    try {
      const res = await fetch('/api/messages/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContact?.id,
          messageId: selectedMessage?.id,
          text: replyText,
          replyToId: replyToMsg?.id ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reply');
      setSendState('sent');
      setReplyText('');
      setReplyToMsg(null);
      mutateMessages();
      mutateContacts();
      setTimeout(() => setSendState('idle'), 3000);
    } catch (err) {
      setSendState('error');
      setSendError(err instanceof Error ? err.message : 'Failed to send reply');
    }
  };

  const handleReplyTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setReplyText(val);

    if (val.startsWith('/')) {
      setShowCannedResponses(true);
      setCannedSearch(val.slice(1).toLowerCase());
      setCannedSelectedIndex(0);
    } else {
      setShowCannedResponses(false);
    }
  };

  const filteredCannedResponses = Array.isArray(cannedResponses) 
    ? cannedResponses.filter(cr => cr.shortcut.toLowerCase().includes(cannedSearch))
    : [];

  const handleCannedResponseSelect = (content: string) => {
    setReplyText(content);
    setShowCannedResponses(false);
    if (textareaRef.current) textareaRef.current.focus();
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [replyText]);

  // Auto-analyze new inbound messages
  useEffect(() => {
    if (conversationMessages.length > 0) {
      const latestMsg = conversationMessages[conversationMessages.length - 1];
      if (latestMsg && !latestMsg.isOutbound) {
        // Synchronously check and mark as analyzing to prevent parallel race conditions
        if (analyzingMsgIdsRef.current.has(latestMsg.id)) return;
        analyzingMsgIdsRef.current.add(latestMsg.id);

        // Check if already analyzed in browser IndexedDB or DB
        getOrExtractMessageAiInsight(latestMsg).then(existingInsight => {
          if (!existingInsight) {
            fetch('/api/ai/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messageId: latestMsg.id,
                contactPersona: selectedContact?.aiPersona || undefined,
              }),
            })
              .then(async r => {
                if (r.ok) {
                  const insight = await r.json() as MessageAiInsight;
                  // 1. Save all AI inside browser IndexedDB
                  await saveLocalMessageAi(insight);
                  
                  // 2. Set active insight
                  if (selectedMessage?.id === latestMsg.id) {
                    setActiveAiInsight(insight);
                  }
                  
                  // 3. Make the reply appear as an auto chat bubble from AI in agentChat
                  const promptText = `Customer's Core Intent: "${insight.analysis}"\n\nI suggest these replies:`;
                  const repliesBlock = insight.suggestedReplies.map(reply => `<reply>${reply}</reply>`).join('\n');
                  const fullMessageText = `${promptText}\n\n${repliesBlock}`;
                  
                  setAgentChat(prev => {
                    if (prev.some(m => m.parts[0].text.includes(insight.analysis))) return prev;
                    return [...prev, { role: 'model', parts: [{ text: fullMessageText }] }];
                  });
                } else {
                  // If API failed, remove from set to allow retry if needed
                  analyzingMsgIdsRef.current.delete(latestMsg.id);
                }
              })
              .catch(err => {
                console.error(err);
                analyzingMsgIdsRef.current.delete(latestMsg.id);
              });
          } else {
            // Already exists in IndexedDB/DB, ensure active insight is updated if needed
            if (selectedMessage?.id === latestMsg.id) {
              setActiveAiInsight(existingInsight);
            }
            // Make the reply appear as an auto chat bubble from AI in agentChat
            const promptText = `Customer's Core Intent: "${existingInsight.analysis}"\n\nI suggest these replies:`;
            const repliesBlock = existingInsight.suggestedReplies.map(reply => `<reply>${reply}</reply>`).join('\n');
            const fullMessageText = `${promptText}\n\n${repliesBlock}`;
            
            setAgentChat(prev => {
              if (prev.some(m => m.parts[0].text.includes(existingInsight.analysis))) return prev;
              return [...prev, { role: 'model', parts: [{ text: fullMessageText }] }];
            });
          }
        });
      }
    }
  }, [conversationMessages, selectedMessage]);

  // Auto-sync selectedMessage when new message arrives
  useEffect(() => {
    if (conversationMessages.length > 0) {
      const latestMsg = conversationMessages[conversationMessages.length - 1];
      const prevId = prevLatestMsgIdRef.current;
      prevLatestMsgIdRef.current = latestMsg?.id || null;
      if (latestMsg && latestMsg.id !== prevId) setSelectedMessage(latestMsg);
    } else {
      prevLatestMsgIdRef.current = null;
    }
  }, [conversationMessages]);

  // Sync selectedMessage with the latest data from conversationMessages
  useEffect(() => {
    if (selectedMessage && conversationMessages.length > 0) {
      const updated = conversationMessages.find(m => m.id === selectedMessage.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedMessage)) {
        setSelectedMessage(updated);
      }
    }
  }, [conversationMessages, selectedMessage]);

  const unreadCount = contacts.reduce((acc, c) => acc + c.messages.filter(m => !m.isRead).length, 0);

  return (
    <div ref={layoutRef} className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground transition-colors duration-300" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>

      {/* Unsend modal — platform-aware for-me / for-everyone */}
      {unsendModal && (
        <UnsendModal
          msg={unsendModal}
          onUnsendForMe={handleUnsendForMe}
          onUnsendForEveryone={handleUnsendForEveryone}
          onCancel={() => setUnsendModal(null)}
          loading={isDeleting}
        />
      )}

      {/* Hard delete modal — message or conversation */}
      {deleteModal && (
        <DeleteModal
          title={deleteModal.type === 'conversation' ? 'Delete Conversation' : 'Delete Message'}
          description={
            deleteModal.type === 'conversation'
              ? 'All messages in this conversation will be permanently deleted. This cannot be undone.'
              : 'This message will be permanently deleted and cannot be recovered.'
          }
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteModal(null)}
          loading={isDeleting}
        />
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm transition-opacity cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white/75 hover:text-white bg-white/10 p-2.5 rounded-full hover:bg-white/20 transition-all border border-white/10"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <div 
            className="relative max-w-[90vw] max-h-[85vh] overflow-hidden rounded-2xl border border-white/15 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getMediaProxyUrl(lightboxUrl)}
              alt="High Resolution Preview"
              className="w-auto h-auto max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white/90 px-4 py-1.5 rounded-full text-xs font-medium backdrop-blur-md border border-white/10">
              <a href={getMediaProxyUrl(lightboxUrl)} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1.5">
                Open Original Image ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {isMobile ? (
        <div className="flex h-[100dvh] w-[100dvw] overflow-hidden bg-background">
          {/* LEFT SIDEBAR - Mobile Drawer */}
          <div className={`h-full shrink-0 transition-all duration-300 z-50 bg-background ${isLeftOpen ? 'w-[280px] absolute shadow-2xl' : 'w-0 overflow-hidden'}`}>
            <LeftSidebar
              activePlatform={activePlatform}
              setActivePlatform={setActivePlatform}
              setSelectedMessage={setSelectedMessage}
              unreadCount={unreadCount}
              orgData={orgData}
              orgSwitcherOpen={orgSwitcherOpen}
              setOrgSwitcherOpen={setOrgSwitcherOpen}
              mutateOrgs={mutateOrgs}
              mutateMessages={mutateMessages}
              mutateContacts={mutateContacts}
              platforms={DEFAULT_PLATFORMS}
              setIsLeftOpen={setIsLeftOpen}
            />
          </div>
          
          {/* Overlay for mobile when sidebar is expanded */}
          {isLeftOpen && (
            <div 
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsLeftOpen(false)}
            />
          )}

          {!selectedContact ? (
            <div className="flex flex-col h-full flex-1 overflow-hidden min-w-0">
              <div className="flex-1 h-full min-w-0">
                <MessageListPane
                  isLeftOpen={isLeftOpen}
                  setIsLeftOpen={setIsLeftOpen}
                  filtered={filtered}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  contactsLoading={contactsLoading}
                  contactsError={contactsError}
                  mutateContacts={mutateContacts}
                  mutateMessages={mutateMessages}
                  selectedContact={selectedContact}
                  handleSelectContact={handleSelectContact}
                  activePlatform={activePlatform}
                  setActivePlatform={setActivePlatform}
                  unreadCount={unreadCount}
                  orgData={orgData}
                  isMobile={isMobile}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 h-full flex flex-col min-w-0 bg-background relative animate-in slide-in-from-right duration-300 ease-out">
              {/* Header */}
              <div className="shrink-0 px-4 py-3.5 border-b border-border bg-surface/80 backdrop-blur-sm flex items-center justify-between z-10">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => setSelectedContact(null)}
                    className="p-2 -ml-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all shrink-0"
                    title="Back to messages"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <SafeAvatar
                    src={selectedContact.avatarUrl}
                    name={selectedContact.name}
                    className="w-8 h-8 rounded-full border border-border shadow-sm shrink-0"
                    textClassName="text-[10px] font-bold"
                  />
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {selectedContact.name || `Customer ···${selectedContact.platformId.slice(-6)}`}
                    </h3>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                      via {platformLabel(selectedContact.platform)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Delete Conversation — ADMIN/OWNER only */}
                  {canDelete && conversationMessages.length > 0 && (
                    <button
                      onClick={() => setDeleteModal({ type: 'conversation' })}
                      className="p-2 rounded-lg text-red-500/70 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                      title="Delete entire conversation"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsRightOpen(!isRightOpen)}
                    className={`p-2 rounded-lg transition-all ${isRightOpen ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'}`}
                    title="Toggle AI Panel"
                  >
                    {isRightOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Messages Container */}
              <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-4"
                onClick={() => setOpenMenuMsgId(null)}
              >
                <div className="min-h-full flex flex-col justify-end gap-4">
                  {(isScrollingUp || isValidatingMessages) && conversationMessages.length >= 20 && (
                    <div className="flex justify-center py-2 shrink-0">
                      <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                    </div>
                  )}
                  {conversationMessages.map((msg) => {
                    const msgReaction = reactions.find(r => r.msgId === msg.id) || (msg.reaction ? { emoji: msg.reaction, msgId: msg.id } : null);
                    const isMenuOpen = openMenuMsgId === msg.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2 max-w-[85%] group ${msg.isOutbound ? 'self-end flex-row-reverse' : ''} ${selectedMessage?.id === msg.id ? 'opacity-100' : 'opacity-85 hover:opacity-100'}`}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0 mt-0.5">
                          <div
                            className={`w-6 h-6 rounded-full border flex items-center justify-center overflow-hidden text-[7px] font-extrabold tracking-tight cursor-pointer ${
                              msg.isOutbound 
                                ? msg.isAiReply 
                                  ? 'border-violet-500/30 shadow-[0_0_8px_rgba(139,92,246,0.3)] bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-500' 
                                  : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500' 
                                : 'bg-muted border-border'
                            }`}
                            onClick={(e) => { e.stopPropagation(); handleSelectMessage(msg); }}
                          >
                            {msg.isOutbound
                              ? msg.isAiReply
                                ? <Sparkles className="w-3 h-3 text-white animate-pulse" />
                                : (() => {
                                    const platCfg = platformsData?.configs?.find((c: any) => c.platform === msg.platform);
                                    if (platCfg?.connectedAvatar) {
                                      return <SafeAvatar src={platCfg.connectedAvatar} name={msg.repliedBy?.name || 'User'} className="w-full h-full rounded-full" textClassName="text-[8px] font-extrabold" />;
                                    }
                                    if (msg.repliedBy) {
                                      return (msg.repliedBy.name || msg.repliedBy.email || 'Me').substring(0, 2).toUpperCase();
                                    }
                                    return <PlatformIcon platform={msg.platform} size="sm" />;
                                  })()
                              : <SafeAvatar src={selectedContact.avatarUrl} name={selectedContact.name || 'Customer'} className="w-full h-full rounded-full" textClassName="text-[8px] font-extrabold" />
                            }
                          </div>
                          <div className={`absolute bottom-[-3px] ${msg.isOutbound ? 'left-[-3px]' : 'right-[-3px]'} bg-background rounded-full p-0.25 border border-border flex items-center justify-center shadow-sm z-10 scale-75`}>
                            <PlatformIcon platform={msg.platform} size="xs" />
                          </div>
                        </div>

                        {/* Bubble Container */}
                        <div className={`relative ${msg.isOutbound ? 'text-right' : ''}`}>
                          {/* Options button */}
                          <div
                            className={`absolute top-0.5 z-20 ${msg.isOutbound ? 'left-0 -translate-x-full -ml-1' : 'right-0 translate-x-full ml-1'} opacity-0 group-hover:opacity-100 transition-opacity duration-150`}
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuMsgId(isMenuOpen ? null : msg.id); }}
                              className={`p-1 rounded-lg transition-all ${isMenuOpen ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200' : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                            {isMenuOpen && (
                              <MessageContextMenu
                                msg={msg}
                                isOutbound={msg.isOutbound}
                                canDelete={canDelete}
                                onAction={(action, payload) => handleMenuAction(action, msg, payload)}
                                onClose={() => setOpenMenuMsgId(null)}
                              />
                            )}
                          </div>

                          {/* Bubble */}
                          <div
                            className={`border rounded-xl px-3 py-2 shadow-sm cursor-pointer transition-all ${
                              msg.isOutbound
                                ? 'rounded-tr-sm bg-indigo-600 text-white border-indigo-500/40'
                                : 'rounded-tl-sm bg-surface-elevated text-foreground border-border'
                            } ${selectedMessage?.id === msg.id ? 'ring-2 ring-indigo-400/50 ring-offset-1 ring-offset-background' : ''}`}
                            onClick={(e) => { e.stopPropagation(); handleSelectMessage(msg); }}
                          >
                            {msg.text && !isPlaceholderText(msg.text, !!(msg.imageUrl || msg.audioUrl || msg.videoUrl)) && (
                              <p className="text-xs leading-relaxed mb-0.5">{msg.text}</p>
                            )}

                            {/* Media content */}
                            {msg.imageUrl && (!msg.videoUrl || msg.platform !== 'IG') && (
                              <div 
                                className="mt-1.5 overflow-hidden rounded-lg border border-black/10 dark:border-white/10 max-w-[200px] cursor-zoom-in"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxUrl(msg.imageUrl || null);
                                }}
                              >
                                <img
                                  src={getMediaProxyUrl(msg.imageUrl)}
                                  alt="Attachment"
                                  className="w-full h-auto object-cover max-h-[160px]"
                                />
                              </div>
                            )}

                            {msg.audioUrl && (
                              <div className="mt-1.5 w-[200px] bg-neutral-100 dark:bg-neutral-850 rounded-lg p-1.5 border border-black/10 dark:border-white/10 shadow-sm" onClick={(e) => e.stopPropagation()}>
                                <audio
                                  src={getMediaProxyUrl(msg.audioUrl)}
                                  controls
                                  className="w-full outline-none h-8 text-xs"
                                />
                              </div>
                            )}

                            {msg.videoUrl && msg.platform === 'IG' ? (
                              <div className="mt-1.5 overflow-hidden rounded-lg border border-black/10 dark:border-white/10 max-w-[200px] shadow-sm relative group" onClick={(e) => e.stopPropagation()}>
                                <a href={msg.videoUrl} target="_blank" rel="noopener noreferrer" className="block relative cursor-pointer">
                                  {msg.imageUrl ? (
                                    <div className="relative w-full h-[120px] bg-neutral-900">
                                      <img
                                        src={getMediaProxyUrl(msg.imageUrl)}
                                        alt="Reel Preview"
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <Play className="w-8 h-8 fill-white text-white" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-full h-[80px] bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500 flex flex-col items-center justify-center p-2 text-white">
                                      <Play className="w-6 h-6 fill-white text-white mb-1" />
                                      <span className="font-bold text-[9px] uppercase tracking-wide">Reel</span>
                                    </div>
                                  )}
                                  <div className="bg-surface-elevated px-2 py-1.5 border-t border-border flex flex-col gap-0.5 text-[10px]">
                                    <span className="text-indigo-500 font-semibold truncate flex items-center gap-1">
                                      Watch on Instagram <ExternalLink className="w-2.5 h-2.5" />
                                    </span>
                                  </div>
                                </a>
                              </div>
                            ) : msg.videoUrl ? (
                              <div className="mt-1.5 overflow-hidden rounded-lg border border-black/10 dark:border-white/10 max-w-[200px] bg-black" onClick={(e) => e.stopPropagation()}>
                                <video
                                  src={getMediaProxyUrl(msg.videoUrl)}
                                  controls
                                  className="w-full max-h-[160px]"
                                />
                              </div>
                            ) : null}

                            {copiedMsgId === msg.id && (
                              <p className="text-[9px] mt-0.5 opacity-70 flex items-center gap-0.5 justify-end">
                                <Check className="w-2.5 h-2.5" /> Copied
                              </p>
                            )}
                          </div>

                          {/* Reaction emoji */}
                          {msgReaction && (
                            <div
                              className={`absolute bottom-[-5px] ${
                                msg.isOutbound ? 'right-2' : 'left-2'
                              } z-30 inline-flex items-center px-1 py-0.25 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-sm text-[10px] select-none cursor-pointer`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setReactions(prev => prev.filter(r => r.msgId !== msg.id));
                                fetch(`/api/messages/${msg.id}/react`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ emoji: null }),
                                }).then(res => {
                                  if (res.ok) mutateMessages();
                                }).catch(console.error);
                              }}
                            >
                              {msgReaction.emoji}
                            </div>
                          )}

                          <p className="text-[9px] text-neutral-500 dark:text-neutral-400 mt-1 ml-1 clear-both">
                            {formatDateTime(msg.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reply Box */}
              <div className="shrink-0 px-4 pb-4 pt-2 bg-background border-t border-border z-10 animate-slideUp">
                {sendState === 'error' && (
                  <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-700 dark:text-red-300">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{sendError}</span>
                  </div>
                )}
                {replyToMsg && <QuotedReply msg={replyToMsg} onClear={() => setReplyToMsg(null)} />}
                
                {/* Canned Responses Popover */}
                {showCannedResponses && filteredCannedResponses.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 mx-4 bg-surface border border-border rounded-xl shadow-xl overflow-hidden max-h-[200px] z-50 animate-in slide-in-from-bottom-2">
                    <div className="px-3 py-2 border-b border-border bg-muted/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Canned Responses
                    </div>
                    <div className="overflow-y-auto">
                      {filteredCannedResponses.map((cr, idx) => (
                        <button
                          key={cr.id}
                          className={`w-full text-left px-3 py-2.5 text-xs transition-colors flex flex-col gap-0.5 ${idx === cannedSelectedIndex ? 'bg-indigo-500/10' : 'hover:bg-muted'}`}
                          onClick={() => handleCannedResponseSelect(cr.content)}
                        >
                          <span className={`font-bold ${idx === cannedSelectedIndex ? 'text-indigo-600 dark:text-indigo-400' : 'text-foreground'}`}>
                            /{cr.shortcut}
                          </span>
                          <span className="text-muted-foreground truncate">{cr.content}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`relative rounded-xl border transition-all duration-200 flex items-end p-1.5 gap-1.5 ${
                  sendState === 'sent' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-surface focus-within:border-ring focus-within:bg-surface-elevated'
                }`}>
                  <textarea
                    ref={textareaRef}
                    value={replyText}
                    onChange={handleReplyTextChange}
                    onKeyDown={e => {
                      if (showCannedResponses && filteredCannedResponses.length > 0) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setCannedSelectedIndex(prev => Math.min(prev + 1, filteredCannedResponses.length - 1));
                          return;
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setCannedSelectedIndex(prev => Math.max(prev - 1, 0));
                          return;
                        }
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleCannedResponseSelect(filteredCannedResponses[cannedSelectedIndex].content);
                          return;
                        }
                        if (e.key === 'Escape') {
                          setShowCannedResponses(false);
                          return;
                        }
                      }
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (replyText.trim() && sendState !== 'sending' && sendState !== 'sent') {
                          handleSend();
                        }
                      }
                    }}
                    disabled={sendState === 'sending'}
                    placeholder="Type a message…"
                    rows={1}
                    className="flex-1 bg-transparent px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed min-h-[32px] max-h-[80px] overflow-y-auto"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!replyText.trim() || sendState === 'sending' || sendState === 'sent'}
                    className={`p-1.5 rounded-full shrink-0 flex items-center justify-center transition-all duration-200 ${
                      sendState === 'sent'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : sendState === 'sending'
                          ? 'bg-indigo-500/10 text-indigo-600'
                          : 'bg-indigo-600 text-white disabled:opacity-30'
                    }`}
                  >
                    {sendState === 'sent' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : sendState === 'sending' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Mobile Right Sidebar Pane inside Drawer overlay */}
              {isRightOpen && selectedContact && (
                <div className="fixed inset-0 z-[140] flex justify-end animate-fadeIn">
                  <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setIsRightOpen(false)}
                  />
                  <div className="relative flex flex-col w-[320px] max-w-[85vw] h-full bg-background border-l border-border animate-in slide-in-from-right duration-300 shadow-2xl">
                    <div className="p-3 border-b border-border flex items-center justify-between bg-surface shrink-0">
                      <span className="text-xs font-bold text-neutral-500">AI Copilot</span>
                      <button 
                        onClick={() => setIsRightOpen(false)}
                        className="p-1 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <RightSidebarPane
                        selectedContact={selectedContact}
                        selectedMessage={selectedMessage}
                        replyText={replyText}
                        setReplyText={setReplyText}
                        agentChat={agentChat}
                        agentInput={agentInput}
                        setAgentInput={setAgentInput}
                        isAgentLoading={isAgentLoading}
                        setIsAgentLoading={setIsAgentLoading}
                        setAgentChat={setAgentChat}
                        conversationMessages={conversationMessages}
                        onToggleAutoRespond={handleToggleAutoRespond}
                        isTogglingAutoRespond={isTogglingAutoRespond}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <Group orientation="horizontal" id="dashboard-layout">
          {/* LEFT SIDEBAR */}
          {isLeftOpen && (
            <Panel defaultSize={`${(LEFT_NAV_DEFAULT_PX / layoutWidth) * 80}%`} minSize={`${(LEFT_NAV_MIN_PX / layoutWidth) * 100}%`} maxSize="35%">
              <LeftSidebar
                activePlatform={activePlatform}
                setActivePlatform={setActivePlatform}
                setSelectedMessage={setSelectedMessage}
                unreadCount={unreadCount}
                orgData={orgData}
                orgSwitcherOpen={orgSwitcherOpen}
                setOrgSwitcherOpen={setOrgSwitcherOpen}
                mutateOrgs={mutateOrgs}
                mutateMessages={mutateMessages}
                mutateContacts={mutateContacts}
                platforms={DEFAULT_PLATFORMS}
                setIsLeftOpen={setIsLeftOpen}
              />
            </Panel>
          )}
          {isLeftOpen && <Separator className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize z-50" />}

          {/* MESSAGE LIST */}
          <Panel defaultSize={`${(MESSAGE_LIST_DEFAULT_PX / layoutWidth) * 80}%`} minSize={`${(MESSAGE_LIST_MIN_PX / layoutWidth) * 100}%`} maxSize="45%">
            <MessageListPane
              isLeftOpen={isLeftOpen}
              setIsLeftOpen={setIsLeftOpen}
              filtered={filtered}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              contactsLoading={contactsLoading}
              contactsError={contactsError}
              mutateContacts={mutateContacts}
              mutateMessages={mutateMessages}
              selectedContact={selectedContact}
              handleSelectContact={handleSelectContact}
              activePlatform={activePlatform}
              setActivePlatform={setActivePlatform}
              unreadCount={unreadCount}
              orgData={orgData}
              isMobile={isMobile}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
            />
          </Panel>

          <Separator className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize z-50" />

          {/* CONVERSATION VIEW */}
          <Panel defaultSize="50%" minSize="30%">
            <section className="h-full flex flex-col min-w-0 bg-background relative">
              {selectedContact ? (
                <>
                  {/* Header */}
                  <div className="shrink-0 px-6 py-4 border-b border-border bg-surface/80 backdrop-blur-sm flex items-center justify-between z-10">
                    <div className="flex items-center gap-3 min-w-0">
                      <SafeAvatar
                        src={selectedContact.avatarUrl}
                        name={selectedContact.name}
                        className="w-9 h-9 rounded-xl border border-border shadow-sm shrink-0"
                        textClassName="text-xs font-bold"
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {selectedContact.name || `Customer ···${selectedContact.platformId.slice(-6)}`}
                        </h3>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                          via {platformLabel(selectedContact.platform)}
                        </p>
                      </div>

                      {activeAiInsight && (
                        <div className="hidden sm:flex items-center gap-3 pl-3 ml-3 border-l border-border min-w-0 max-w-[240px] md:max-w-[320px] lg:max-w-[450px]">
                          <div className="flex items-center gap-1.5 shrink-0">
                            {activeAiInsight.category && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted border border-border text-[8px] font-extrabold uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">
                                {activeAiInsight.category}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Delete Conversation — ADMIN/OWNER only */}
                      {canDelete && conversationMessages.length > 0 && (
                        <button
                          onClick={() => setDeleteModal({ type: 'conversation' })}
                          className="p-2 rounded-lg text-red-500/70 hover:text-red-650 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-transparent hover:border-red-200 dark:hover:border-red-500/20 transition-all"
                          title="Delete entire conversation"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setIsRightOpen(!isRightOpen)}
                        className={`p-2 rounded-lg transition-all ${isRightOpen ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'}`}
                        title="Toggle AI Panel"
                      >
                        {isRightOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-6 py-6"
                    onClick={() => setOpenMenuMsgId(null)}
                  >
                    <div className="min-h-full flex flex-col justify-end gap-4">
                      {(isScrollingUp || isValidatingMessages) && conversationMessages.length >= 20 && (
                        <div className="flex justify-center py-2 shrink-0">
                          <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                        </div>
                      )}
                      {conversationMessages.map((msg) => {
                        const msgReaction = reactions.find(r => r.msgId === msg.id) || (msg.reaction ? { emoji: msg.reaction, msgId: msg.id } : null);
                        const isMenuOpen = openMenuMsgId === msg.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex items-start gap-3 max-w-2xl group ${msg.isOutbound ? 'self-end flex-row-reverse' : ''} ${selectedMessage?.id === msg.id ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
                          >
                            {/* Avatar */}
                            <div className="relative shrink-0 mt-0.5">
                              <div
                                className={`w-7 h-7 rounded-full border flex items-center justify-center overflow-hidden text-[8px] font-extrabold tracking-tight cursor-pointer ${
                                  msg.isOutbound 
                                    ? msg.isAiReply 
                                      ? 'border-violet-500/30 shadow-[0_0_8px_rgba(139,92,246,0.3)] bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-500' 
                                      : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500' 
                                    : 'bg-muted border-border'
                                }`}
                                onClick={(e) => { e.stopPropagation(); handleSelectMessage(msg); }}
                              >
                                {msg.isOutbound
                                  ? msg.isAiReply
                                    ? <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                                    : (() => {
                                        const platCfg = platformsData?.configs?.find((c: any) => c.platform === msg.platform);
                                        if (platCfg?.connectedAvatar) {
                                          return <SafeAvatar src={platCfg.connectedAvatar} name={msg.repliedBy?.name || 'User'} className="w-full h-full rounded-full" textClassName="text-[8px] font-extrabold" />;
                                        }
                                        if (msg.repliedBy) {
                                          return (msg.repliedBy.name || msg.repliedBy.email || 'Me').substring(0, 2).toUpperCase();
                                        }
                                        return <PlatformIcon platform={msg.platform} size="sm" />;
                                      })()
                                  : <SafeAvatar src={selectedContact.avatarUrl} name={selectedContact.name || 'Customer'} className="w-full h-full rounded-full" textClassName="text-[8px] font-extrabold" />
                                }
                              </div>
                              <div className={`absolute bottom-[-3px] ${msg.isOutbound ? 'left-[-3px]' : 'right-[-3px]'} bg-background rounded-full p-0.5 border border-border flex items-center justify-center shadow-sm z-10`}>
                                <PlatformIcon platform={msg.platform} size="xs" />
                              </div>
                            </div>

                            {/* Bubble + three-dot menu */}
                            <div className={`relative ${msg.isOutbound ? 'text-right' : ''}`}>
                              {/* ⋮ button */}
                              <div
                                className={`absolute top-1 z-20 ${msg.isOutbound ? 'left-0 -translate-x-full -ml-1' : 'right-0 translate-x-full ml-1'} opacity-0 group-hover:opacity-100 transition-opacity duration-150`}
                                onClick={e => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOpenMenuMsgId(isMenuOpen ? null : msg.id); }}
                                  className={`p-1 rounded-lg transition-all ${isMenuOpen ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200' : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                                  title="Message options"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                                {isMenuOpen && (
                                  <MessageContextMenu
                                    msg={msg}
                                    isOutbound={msg.isOutbound}
                                    canDelete={canDelete}
                                    onAction={(action, payload) => handleMenuAction(action, msg, payload)}
                                    onClose={() => setOpenMenuMsgId(null)}
                                  />
                                )}
                              </div>

                              {/* Bubble */}
                              <div
                                className={`border rounded-2xl px-4 py-3 shadow-sm cursor-pointer transition-all ${
                                  msg.isOutbound
                                    ? 'rounded-tr-sm bg-indigo-600 text-white border-indigo-500/40'
                                    : 'rounded-tl-sm bg-surface-elevated text-foreground border-border'
                                } ${selectedMessage?.id === msg.id ? 'ring-2 ring-indigo-400/50 ring-offset-1 ring-offset-background' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handleSelectMessage(msg); }}
                              >
                                {msg.text && !isPlaceholderText(msg.text, !!(msg.imageUrl || msg.audioUrl || msg.videoUrl)) && (
                                  <p className="text-sm leading-relaxed mb-1">{msg.text}</p>
                                )}
                                
                                {/* Media Renderers */}
                                {msg.imageUrl && (!msg.videoUrl || msg.platform !== 'IG') && (
                                  <div 
                                    className="mt-2 overflow-hidden rounded-xl border border-black/10 dark:border-white/10 max-w-[280px] cursor-zoom-in hover:brightness-95 transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLightboxUrl(msg.imageUrl || null);
                                    }}
                                  >
                                    <img
                                      src={getMediaProxyUrl(msg.imageUrl)}
                                      alt="Attachment"
                                      className="w-full h-auto object-cover max-h-[220px]"
                                    />
                                  </div>
                                )}
                                
                                {msg.audioUrl && (
                                  <div className="mt-2 w-[280px] sm:w-[320px] max-w-full bg-neutral-100 dark:bg-neutral-850 rounded-xl p-2 border border-black/10 dark:border-white/10 shadow-sm" onClick={(e) => e.stopPropagation()}>
                                    <audio
                                      src={getMediaProxyUrl(msg.audioUrl)}
                                      controls
                                      className="w-full outline-none h-10"
                                    />
                                  </div>
                                )}
                                
                                {msg.videoUrl && msg.platform === 'IG' ? (
                                  <div className="mt-2 overflow-hidden rounded-xl border border-black/10 dark:border-white/10 max-w-[280px] shadow-md group relative">
                                    <a
                                      href={msg.videoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block relative cursor-pointer"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {msg.imageUrl ? (
                                        <div className="relative w-full h-[180px] bg-neutral-900">
                                          <img
                                            src={getMediaProxyUrl(msg.imageUrl)}
                                            alt="Instagram Reel Preview"
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                          />
                                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30 group-hover:scale-110 transition-transform">
                                              <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="w-full h-[120px] bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500 flex flex-col items-center justify-center p-4 text-white">
                                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30 group-hover:scale-110 transition-transform mb-2">
                                            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                                          </div>
                                          <span className="font-semibold text-xs tracking-wider uppercase text-white">Instagram Reel</span>
                                        </div>
                                      )}
                                      <div className="bg-surface-elevated px-3 py-2 border-t border-border flex flex-col gap-1 text-xs">
                                        <div className="flex items-center justify-between text-indigo-500 font-medium group-hover:text-indigo-600">
                                          <span className="truncate font-semibold">Watch Reel on Instagram</span>
                                          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 ml-1" />
                                        </div>
                                        {msg.videoUrl && (
                                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate block">
                                            {msg.videoUrl}
                                          </span>
                                        )}
                                      </div>
                                    </a>
                                  </div>
                                ) : msg.videoUrl ? (
                                  <div className="mt-2 overflow-hidden rounded-xl border border-black/10 dark:border-white/10 max-w-[280px] bg-black" onClick={(e) => e.stopPropagation()}>
                                    <video
                                      src={getMediaProxyUrl(msg.videoUrl)}
                                      controls
                                      className="w-full max-h-[220px]"
                                    />
                                  </div>
                                ) : null}

                                {copiedMsgId === msg.id && (
                                  <p className="text-[10px] mt-1 opacity-70 flex items-center gap-1 justify-end">
                                    <Check className="w-2.5 h-2.5" /> Copied
                                  </p>
                                )}
                              </div>

                              {/* Emoji reaction */}
                              {msgReaction && (
                                <div
                                  className={`absolute bottom-[-6px] ${
                                    msg.isOutbound ? 'right-3' : 'left-3'
                                  } z-30 inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/95 dark:bg-neutral-800/95 border border-neutral-200 dark:border-neutral-700 shadow-sm text-[11px] select-none cursor-pointer hover:scale-110 transition-transform`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Optimistic local update
                                    setReactions(prev => prev.filter(r => r.msgId !== msg.id));
                                    // Sync remove with Meta & database
                                    fetch(`/api/messages/${msg.id}/react`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ emoji: null }),
                                    }).then(res => {
                                      if (res.ok) mutateMessages();
                                    }).catch(console.error);
                                  }}
                                  title="Click to remove"
                                >
                                  {msgReaction.emoji}
                                </div>
                              )}

                              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1.5 ml-1 clear-both">
                                {msg.isOutbound 
                                   ? msg.isAiReply 
                                     ? 'AI Assistant' 
                                     : msg.repliedBy 
                                       ? (msg.repliedBy.name || 'Agent') 
                                       : platformLabel(msg.platform) 
                                   : 'Customer'} · {formatDateTime(msg.timestamp)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reply box */}
                  <div className="shrink-0 px-6 pb-6 pt-3 bg-background border-t border-border z-10 animate-slideUp">
                    {sendState === 'error' && (
                      <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{sendError}</span>
                      </div>
                    )}
                    {replyToMsg && <QuotedReply msg={replyToMsg} onClear={() => setReplyToMsg(null)} />}
                    
                    {/* Canned Responses Popover */}
                    {showCannedResponses && filteredCannedResponses.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-3 mx-6 bg-surface border border-border rounded-xl shadow-xl overflow-hidden max-h-[250px] z-50 animate-in slide-in-from-bottom-2">
                        <div className="px-4 py-2 border-b border-border bg-muted/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Canned Responses
                        </div>
                        <div className="overflow-y-auto max-h-[200px]">
                          {filteredCannedResponses.map((cr, idx) => (
                            <button
                              key={cr.id}
                              className={`w-full text-left px-4 py-3 text-sm transition-colors flex flex-col gap-0.5 ${idx === cannedSelectedIndex ? 'bg-indigo-500/10' : 'hover:bg-muted'}`}
                              onClick={() => handleCannedResponseSelect(cr.content)}
                            >
                              <span className={`font-bold ${idx === cannedSelectedIndex ? 'text-indigo-600 dark:text-indigo-400' : 'text-foreground'}`}>
                                /{cr.shortcut}
                              </span>
                              <span className="text-muted-foreground truncate">{cr.content}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={`relative rounded-xl border transition-all duration-200 flex items-end p-2 gap-2 ${
                      sendState === 'sent' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-surface focus-within:border-ring focus-within:bg-surface-elevated'
                    }`}>
                      <textarea
                        ref={textareaRef}
                        value={replyText}
                        onChange={handleReplyTextChange}
                        onKeyDown={e => {
                          if (showCannedResponses && filteredCannedResponses.length > 0) {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setCannedSelectedIndex(prev => Math.min(prev + 1, filteredCannedResponses.length - 1));
                              return;
                            }
                            if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setCannedSelectedIndex(prev => Math.max(prev - 1, 0));
                              return;
                            }
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleCannedResponseSelect(filteredCannedResponses[cannedSelectedIndex].content);
                              return;
                            }
                            if (e.key === 'Escape') {
                              setShowCannedResponses(false);
                              return;
                            }
                          }
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (replyText.trim() && sendState !== 'sending' && sendState !== 'sent') {
                              handleSend();
                            }
                          }
                        }}
                        disabled={sendState === 'sending'}
                        placeholder="Type a message…"
                        rows={1}
                        className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed min-h-[38px] max-h-[120px] overflow-y-auto"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!replyText.trim() || sendState === 'sending' || sendState === 'sent'}
                        className={`p-2 rounded-full shrink-0 flex items-center justify-center transition-all duration-200 ${
                          sendState === 'sent'
                            ? 'bg-emerald-50/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : sendState === 'sending'
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 disabled:opacity-30 disabled:bg-neutral-200 dark:disabled:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-600 disabled:shadow-none'
                        }`}
                        title="Send message"
                      >
                        {sendState === 'sent' ? (
                          <Check className="w-4 h-4" />
                        ) : sendState === 'sending' ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-8 relative">
                  <div className="absolute top-4 right-4"><ThemeToggle /></div>
                  {orgData && orgData.orgs.length === 0 ? (
                    <>
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/5 animate-pulse">
                        <Building2 className="w-8 h-8 text-indigo-400/60" />
                      </div>
                      <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mb-2">Create your first workspace</h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm leading-relaxed mb-8">
                        Get started by creating a workspace for your team, message integrations, and AI reply assistant.
                      </p>
                      <Link href="/create-organization" className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all">
                        <Building2 className="w-4 h-4" /> Create Workspace
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/5">
                        <MessageCircle className="w-8 h-8 text-indigo-400/60" />
                      </div>
                      <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-50 mb-2">No messages to display</h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm leading-relaxed mb-8">
                        There are no messages in the current view. Connect your platforms to start receiving messages.
                      </p>
                      <Link href="/dashboard/integrations" className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all">
                        <Settings className="w-4 h-4" /> Connect Platforms
                      </Link>
                    </>
                  )}
                </div>
              )}
            </section>
          </Panel>

          {isRightOpen && selectedContact && <Separator className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize z-50" />}

          {/* RIGHT SIDEBAR */}
          {selectedContact && isRightOpen && (
            <Panel defaultSize={`${(RIGHT_PANE_DEFAULT_PX / layoutWidth) * 100}%`} minSize={`${(RIGHT_PANE_MIN_PX / layoutWidth) * 100}%`} maxSize="45%">
              <RightSidebarPane
                selectedContact={selectedContact}
                selectedMessage={selectedMessage}
                replyText={replyText}
                setReplyText={setReplyText}
                agentChat={agentChat}
                agentInput={agentInput}
                setAgentInput={setAgentInput}
                isAgentLoading={isAgentLoading}
                setIsAgentLoading={setIsAgentLoading}
                setAgentChat={setAgentChat}
                conversationMessages={conversationMessages}
                onToggleAutoRespond={handleToggleAutoRespond}
                isTogglingAutoRespond={isTogglingAutoRespond}
              />
            </Panel>
          )}
        </Group>
      )}
    </div>
  );
}
