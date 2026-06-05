import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import {
  Bot, RefreshCw, Send, Settings, Sparkles, Menu, Trash2, UserCog,
  User, FileText, MessageSquare, StickyNote, Star, TrendingUp,
  Phone, Mail, Globe, Clock, ChevronRight, Edit3, Check, X, Tag,
} from 'lucide-react';
import { Contact, Message } from './dashboard-types';
import { platformLabel, SafeAvatar } from './dashboard-ui';
import { useSWRConfig } from 'swr';

type AgentChatMessage = { role: 'user' | 'model'; parts: [{ text: string }] };

type RightSidebarPaneProps = {
  selectedContact: Contact | null;
  selectedMessage: Message | null;
  replyText: string;
  setReplyText: (text: string) => void;
  agentChat: AgentChatMessage[];
  agentInput: string;
  setAgentInput: (text: string) => void;
  isAgentLoading: boolean;
  setIsAgentLoading: (loading: boolean) => void;
  setAgentChat: Dispatch<SetStateAction<AgentChatMessage[]>>;
  conversationMessages: Message[];
  onToggleAutoRespond?: () => Promise<void>;
  isTogglingAutoRespond?: boolean;
};

type RightTab = 'ai' | 'profile';

// Qualification label → colors
const QUAL_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  Hot:  { bg: 'bg-red-500/10',    text: 'text-red-500',    bar: 'bg-red-500'    },
  Warm: { bg: 'bg-amber-500/10',  text: 'text-amber-500',  bar: 'bg-amber-500'  },
  Cold: { bg: 'bg-sky-500/10',    text: 'text-sky-400',    bar: 'bg-sky-400'    },
};

export function RightSidebarPane({
  selectedContact,
  selectedMessage,
  replyText,
  setReplyText,
  agentChat,
  agentInput,
  setAgentInput,
  isAgentLoading,
  setIsAgentLoading,
  setAgentChat,
  conversationMessages,
  onToggleAutoRespond,
  isTogglingAutoRespond: parentIsToggling,
}: RightSidebarPaneProps) {
  const { mutate } = useSWRConfig();
  const [activeTab, setActiveTab] = useState<RightTab>('ai');
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState(false);
  const [personaInstructions, setPersonaInstructions] = useState('');
  const [isProcessingPersona, setIsProcessingPersona] = useState(false);
  const [activePersonaText, setActivePersonaText] = useState<string | null>(selectedContact?.aiPersona || null);
  const [autoRespond, setAutoRespond] = useState<boolean>(selectedContact?.autoRespond || false);
  const [isTogglingAutoRespond, setIsTogglingAutoRespond] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [personaExpanded, setPersonaExpanded] = useState(false);

  // Internal notes editing
  const [internalNotes, setInternalNotes] = useState<string>(selectedContact?.internalNotes || '');
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);



  // Parse business notes
  const businessNotes = (() => {
    if (!selectedContact?.businessNotes) return null;
    try { return JSON.parse(selectedContact.businessNotes); } catch { return null; }
  })();

  const qualLabel = businessNotes?.qualificationLabel || 'Cold';
  const qualScore = businessNotes?.qualificationScore ?? 32;
  const qualColors = QUAL_COLORS[qualLabel] || QUAL_COLORS['Cold'];

  // AI chat scroll
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentChat, isAgentLoading]);

  // Sync when contact changes
  useEffect(() => {
    setActivePersonaText(selectedContact?.aiPersona || null);
    setAutoRespond(selectedContact?.autoRespond || false);
    setPersonaInstructions('');
    setEditingPersona(false);
    setInternalNotes(selectedContact?.internalNotes || '');
    setEditingNotes(false);
  }, [selectedContact, selectedContact?.autoRespond]);

  const handleToggleAutoRespond = async () => {
    if (!selectedContact) return;
    if (onToggleAutoRespond) {
      await onToggleAutoRespond();
      return;
    }
    if (isTogglingAutoRespond) return;
    setIsTogglingAutoRespond(true);
    const targetState = !autoRespond;
    try {
      const res = await fetch(`/api/contacts/${selectedContact.id}/auto-respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: targetState }),
      });
      if (res.ok) {
        setAutoRespond(targetState);
        selectedContact.autoRespond = targetState;
        mutate(key => typeof key === 'string' && key.startsWith('/api/contacts'));
      }
    } catch (err) {
      console.error('Failed to toggle auto-respond:', err);
    } finally {
      setIsTogglingAutoRespond(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedContact) return;
    setSavingNotes(true);
    try {
      await fetch(`/api/contacts/${selectedContact.id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internalNotes }),
      });
      setEditingNotes(false);
      if (selectedContact) selectedContact.internalNotes = internalNotes;
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };



  return (
    <aside className="h-full flex flex-col min-w-0 bg-surface-muted border-l border-border backdrop-blur-sm transition-all duration-300 ease-in-out">      {/* Tab Toggle */}
      <div className="shrink-0 px-3 pt-3 pb-0 border-b border-border bg-surface/50">
        <div className="mb-3">
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-full">
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                activeTab === 'ai'
                  ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              AI Copilot
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Contact Info
            </button>
          </div>
        </div>
      </div>
      {/* ─── AI COPILOT TAB ─── */}
      {activeTab === 'ai' && (
        <>
          {/* Agent chat messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {agentChat.length > 0 && (
              <div className="flex justify-end mb-1">
                <button
                  type="button"
                  onClick={() => setAgentChat([])}
                  className="text-[9px] text-neutral-400 hover:text-red-500 font-semibold flex items-center gap-1 transition-colors cursor-pointer bg-transparent border-none p-0"
                >
                  <Trash2 className="w-3 h-3" /> Clear Chat
                </button>
              </div>
            )}
            {agentChat.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center h-full opacity-60 px-4 py-8">
                <Bot className="w-8 h-8 mb-3 text-indigo-500" />
                <p className="text-xs font-medium text-foreground">Ask the AI Agent to refine replies or analyze the conversation!</p>
              </div>
            ) : (
              agentChat.map((msg, idx) => {
                const content = msg.parts[0].text;
                const cleanContent = content.replace(/<reply>[\s\S]*?<\/reply>/g, '').trim();
                const suggestedReplies = [...content.matchAll(/<reply>([\s\S]*?)<\/reply>/g)].map(m => m[1].trim());
                return (
                  <div key={idx} className={`flex gap-2 text-[11px] leading-tight ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center border border-border bg-muted mt-0.5">
                      {msg.role === 'user' ? <Settings className="w-2.5 h-2.5 text-foreground" /> : <Sparkles className="w-2.5 h-2.5 text-indigo-500" />}
                    </div>
                    <div className={`flex flex-col gap-1.5 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {cleanContent && (
                        <div className={`p-2 rounded-lg border shadow-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface-elevated text-foreground border-border'}`}>
                          {cleanContent}
                        </div>
                      )}
                      {suggestedReplies.map((reply, ridx) => (
                        <div key={ridx} onClick={() => setReplyText(reply)} className="w-full bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2 py-1.5 cursor-pointer transition-all active:scale-[0.98] select-none">
                          <p className="text-[11px] italic text-indigo-600 dark:text-indigo-400 font-medium leading-tight">&quot;{reply}&quot;</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
            {isAgentLoading && (
              <div className="flex gap-2 text-[11px] leading-tight">
                <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 mt-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                </div>
                <div className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" /> Thinking...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div className="shrink-0 p-3 border-t border-border bg-background">
            <form
              className="flex items-center gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!agentInput.trim() || isAgentLoading) return;
                const prompt = agentInput.trim();
                setAgentInput('');
                setAgentChat(prev => [...prev, { role: 'user', parts: [{ text: prompt }] }]);
                setIsAgentLoading(true);
                try {
                  const latest6 = conversationMessages.slice(-6);
                  const olderMessages = conversationMessages.slice(-12, -6);
                  const contextStr = latest6.map(m => `${m.isOutbound ? 'Agent' : 'Customer'}: ${m.text}`).join('\n');
                  const olderContextStr = olderMessages.map(m => `${m.isOutbound ? 'Agent' : 'Customer'}: ${m.text}`).join('\n');
                  const res = await fetch('/api/ai/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      prompt,
                      chatHistory: agentChat,
                      context: contextStr,
                      olderContext: olderContextStr,
                      contactPersona: activePersonaText || undefined,
                      contactId: selectedContact?.id,
                    }),
                  });
                  const data = await res.json();
                  if (data.text) setAgentChat(prev => [...prev, { role: 'model', parts: [{ text: data.text }] }]);
                } catch (err) { console.error(err); } finally { setIsAgentLoading(false); }
              }}
            >
              <input
                type="text"
                placeholder="Ask the AI..."
                value={agentInput}
                onChange={e => setAgentInput(e.target.value)}
                disabled={isAgentLoading}
                className="flex-1 min-w-0 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
              />
              <button type="submit" disabled={!agentInput.trim() || isAgentLoading} className="shrink-0 p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </>
      )}

      {/* ─── CONTACT INFO TAB ─── */}
      {activeTab === 'profile' && (
        <div className="flex-1 overflow-y-auto">
          {selectedContact ? (
            <div className="p-4 space-y-4">
              {/* Unified Profile Card with Top-Right Auto Reply Toggle */}
              <div className="relative w-full bg-white dark:bg-neutral-900 border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                {/* Banner Gradient */}
                <div className="h-16 w-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border-b border-border/40" />

                {/* Compact Auto Reply Toggle (Top Right Corner) */}
                <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md px-2 py-1 rounded-full border border-border/80 shadow-sm z-10 hover:border-indigo-500/30 transition-all select-none">
                  <span className="text-[9px] font-extrabold text-neutral-500 dark:text-neutral-405 uppercase tracking-wider">Auto Reply</span>
                  <button
                    type="button"
                    onClick={handleToggleAutoRespond}
                    disabled={isTogglingAutoRespond || parentIsToggling}
                    className={`relative inline-flex h-4 w-7.5 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-250 ease-in-out items-center px-0.5 focus:outline-none ${autoRespond ? 'bg-indigo-600' : 'bg-neutral-250 dark:bg-neutral-800'}`}
                    title={autoRespond ? "Auto-Respond Active" : "Auto-Respond Inactive"}
                  >
                    <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-250 ease-in-out ${autoRespond ? 'translate-x-3.5' : 'translate-x-0'}`} />
                  </button>
                  <span className={`text-[9px] font-black uppercase w-5 text-left ${autoRespond ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-500'}`}>
                    {autoRespond ? 'On' : 'Off'}
                  </span>
                </div>

                {/* Profile Details Content */}
                <div className="flex flex-col items-center px-4 pb-4">
                  {/* Avatar */}
                  <div className="-mt-8 w-16 h-16 rounded-full border-4 border-white dark:border-neutral-900 shadow-md overflow-hidden bg-neutral-100 dark:bg-neutral-800 relative z-20 transition-transform duration-300 hover:scale-105">
                    <SafeAvatar
                      src={selectedContact.avatarUrl}
                      name={selectedContact.name}
                      className="w-full h-full"
                      textClassName="text-lg font-extrabold"
                    />
                  </div>

                  {/* Name */}
                  <h3 className="mt-2.5 text-xs font-bold text-foreground tracking-tight text-center truncate max-w-full px-2" title={selectedContact.name || ''}>
                    {selectedContact.name || `Customer ···${selectedContact.platformId.slice(-6)}`}
                  </h3>

                  {/* Platform Badge */}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[8px] font-extrabold uppercase tracking-wider mt-1.5">
                    {platformLabel(selectedContact.platform)}
                  </span>

                  {/* Metadata Grid */}
                  <div className="w-full grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-border/50 text-[10px]">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[8px] text-neutral-450 uppercase font-bold tracking-wider block">Platform ID</span>
                      <p className="font-mono text-neutral-600 dark:text-neutral-350 truncate" title={selectedContact.platformId}>
                        {selectedContact.platformId}
                      </p>
                    </div>
                    <div className="space-y-0.5 text-right min-w-0">
                      <span className="text-[8px] text-neutral-450 uppercase font-bold tracking-wider block">Member Since</span>
                      <p className="text-neutral-600 dark:text-neutral-350 font-semibold truncate">
                        {new Date(selectedContact.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversation Temperature */}
              <div className="bg-white dark:bg-neutral-900 border border-border rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Conversation Temperature</span>
                  </div>
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${qualColors.bg} ${qualColors.text} uppercase tracking-wider`}>
                    {qualLabel}
                  </span>
                </div>
                {/* Score bar */}
                <div className="space-y-1 max-w-[180px]">
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full transition-all duration-700 ${qualColors.bar}`}
                      style={{ width: `${qualScore}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-neutral-450">
                    <span>Cold</span>
                    <span className="font-bold">{qualScore}</span>
                    <span>Hot</span>
                  </div>
                </div>
                {/* Proper 1-2 Line Conversation Summary */}
                <div className="pt-2.5 border-t border-border/50 space-y-1.5">
                  <span className="text-[9px] font-extrabold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">Conversation Summary</span>
                  {selectedContact.conversationContext ? (
                    <div className="bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-2.5">
                      <p className="text-[11px] text-neutral-700 dark:text-neutral-300 leading-relaxed italic font-medium">
                        &ldquo;{selectedContact.conversationContext}&rdquo;
                      </p>
                    </div>
                  ) : (
                    <div className="bg-neutral-50 dark:bg-neutral-950 border border-border/50 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-neutral-450 italic">No AI summary generated for this conversation yet.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Persona Rules Collapsible Card */}
              <div className="bg-white dark:bg-neutral-900 border border-border rounded-xl p-3.5 space-y-3">
                <button
                  type="button"
                  onClick={() => setPersonaExpanded(!personaExpanded)}
                  className="w-full flex items-center justify-between bg-transparent border-none p-0 text-left cursor-pointer focus:outline-none"
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-505" />
                    <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">AI Persona Rules</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 text-neutral-450 transition-transform duration-200 ${personaExpanded ? 'rotate-90' : ''}`} />
                </button>

                {personaExpanded && (
                  <div className="space-y-3 pt-2 border-t border-border/50 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Instructions for this customer</span>
                      {activePersonaText && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!selectedContact) return;
                            const res = await fetch(`/api/contacts/${selectedContact.id}/persona`, { method: 'DELETE' });
                            if (res.ok) { setActivePersonaText(null); if (selectedContact) selectedContact.aiPersona = null; }
                          }}
                          className="text-[9px] text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 transition-colors cursor-pointer bg-transparent border-none p-0"
                        >
                          <Trash2 className="w-3 h-3" /> Clear
                        </button>
                      )}
                    </div>

                    {activePersonaText ? (
                      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-2.5">
                        <p className="text-[11px] text-foreground leading-normal italic font-medium">&ldquo;{activePersonaText}&rdquo;</p>
                      </div>
                    ) : (
                      <div className="bg-neutral-50 dark:bg-neutral-950 border border-border/50 rounded-lg p-2.5 text-center">
                        <p className="text-[10px] text-neutral-550 leading-normal">Using global system instructions for replies.</p>
                      </div>
                    )}

                    <div className="space-y-1.5 pt-1">
                      <textarea
                        value={personaInstructions}
                        onChange={e => setPersonaInstructions(e.target.value)}
                        placeholder="Add rules (e.g. speak Hinglish, offer BREW10, keep under 2 lines)..."
                        rows={3}
                        className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-250 dark:border-neutral-800 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-450 dark:placeholder:text-neutral-555 transition-all resize-none leading-normal"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!personaInstructions.trim() || !selectedContact || isProcessingPersona) return;
                          setIsProcessingPersona(true);
                          try {
                            const res = await fetch(`/api/contacts/${selectedContact.id}/persona`, {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ instructions: personaInstructions }),
                            });
                            if (res.ok) {
                              const data = await res.json();
                              if (data.aiPersona) { setActivePersonaText(data.aiPersona); setPersonaInstructions(''); if (selectedContact) selectedContact.aiPersona = data.aiPersona; }
                            }
                          } catch (err) { console.error(err); } finally { setIsProcessingPersona(false); }
                        }}
                        disabled={!personaInstructions.trim() || isProcessingPersona}
                        className="w-full py-2 rounded-lg bg-indigo-655 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none"
                      >
                        {isProcessingPersona ? <><RefreshCw className="w-3 h-3 animate-spin" /> Distilling...</> : <><Sparkles className="w-3 h-3" /> Save &amp; Tune with AI</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Extracted Contact Details (Collapsible & dynamic) */}
              <div className="bg-white dark:bg-neutral-900 border border-border rounded-xl p-3.5 space-y-3">
                <button
                  type="button"
                  onClick={() => setInfoExpanded(!infoExpanded)}
                  className="w-full flex items-center justify-between bg-transparent border-none p-0 text-left cursor-pointer focus:outline-none"
                >
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Contact Information (AI Extracted)</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 text-neutral-450 transition-transform duration-200 ${infoExpanded ? 'rotate-90' : ''}`} />
                </button>

                {infoExpanded && (
                  <div className="space-y-2 pt-2 border-t border-border/50 animate-fadeIn">
                    {(() => {
                      const infoEntries = businessNotes?.extractedContactInfo 
                        ? Object.entries(businessNotes.extractedContactInfo).filter(([_, val]) => !!val)
                        : [];
                      
                      if (infoEntries.length === 0) {
                        return <p className="text-[10px] text-neutral-500 italic text-center">No contact info detected by AI yet.</p>;
                      }
                      
                      return infoEntries.map(([key, val]) => (
                        <div key={key} className="flex justify-between items-center text-[11px] gap-2">
                          <span className="text-[9px] text-neutral-500 font-bold uppercase truncate max-w-[80px]" title={key}>{key}</span>
                          <span className="text-foreground font-medium truncate max-w-[150px] text-right" title={String(val)}>
                            {String(val)}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              {/* Conversation Management */}
              <div className="bg-white dark:bg-neutral-900 border border-border rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Management</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    className="text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 py-1.5 focus:outline-none text-neutral-900 dark:text-neutral-100"
                    value={(selectedContact as any).status || 'Active'}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      try {
                        await fetch(`/api/contacts/${selectedContact.id}/status`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: newStatus }),
                        });
                        mutate(key => typeof key === 'string' && key.startsWith('/api/contacts'));
                      } catch (err) { console.error(err); }
                    }}
                  >
                    <option value="Active">Active</option>
                    <option value="Snooze">Snooze</option>
                    <option value="Archive">Archive</option>
                    <option value="Resolve">Resolve</option>
                  </select>

                  <button
                    onClick={async () => {
                      try {
                        await fetch(`/api/contacts/${selectedContact.id}/assign`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: 'me' }),
                        });
                        mutate(key => typeof key === 'string' && key.startsWith('/api/contacts'));
                      } catch (err) { console.error(err); }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all border border-indigo-200 dark:border-indigo-500/20"
                  >
                    <UserCog className="w-3.5 h-3.5" /> Assign to me
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div className="bg-white dark:bg-neutral-900 border border-border rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Tags</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 items-center bg-neutral-50 dark:bg-neutral-950 p-2 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  {((selectedContact as any).tags || []).map((tag: string) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                      {tag}
                      <button
                        onClick={async () => {
                          try {
                            await fetch(`/api/contacts/${selectedContact.id}/tags`, {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ tag }),
                            });
                            mutate(key => typeof key === 'string' && key.startsWith('/api/contacts'));
                          } catch (err) { console.error(err); }
                        }}
                        className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const input = form.elements.namedItem('tag') as HTMLInputElement;
                      const tag = input.value.trim();
                      if (!tag) return;
                      input.value = '';
                      try {
                        await fetch(`/api/contacts/${selectedContact.id}/tags`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ tag }),
                        });
                        mutate(key => typeof key === 'string' && key.startsWith('/api/contacts'));
                      } catch (err) { console.error(err); }
                    }}
                    className="flex items-center flex-1 min-w-[80px]"
                  >
                    <input
                      name="tag"
                      type="text"
                      placeholder="Add tag..."
                      className="text-[10px] bg-transparent border-none focus:outline-none w-full placeholder:text-neutral-400 text-neutral-900 dark:text-neutral-100 px-1"
                    />
                  </form>
                </div>
              </div>

              {/* Internal Notes */}
              <div className="bg-white dark:bg-neutral-900 border border-border rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <StickyNote className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Internal Notes</span>
                  </div>
                  {!editingNotes && (
                    <button onClick={() => setEditingNotes(true)} className="p-1 rounded-lg text-neutral-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {editingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      value={internalNotes}
                      onChange={e => setInternalNotes(e.target.value)}
                      placeholder="Add private notes about this contact..."
                      rows={3}
                      className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 resize-none leading-relaxed transition-all"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setEditingNotes(false)} className="px-2.5 py-1 text-[10px] font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors border-none bg-none">
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-all border-none"
                      >
                        {savingNotes ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    {internalNotes || <span className="italic opacity-60">No notes yet. Click edit to add private notes.</span>}
                  </p>
                )}
              </div>

              {/* Tickets */}
              <div className="bg-white dark:bg-neutral-900 border border-border rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                      Tickets ({selectedContact.tickets?.length || 0})
                    </span>
                  </div>
                  <Link href="/dashboard/tickets" className="p-1 rounded-lg text-neutral-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors">
                    <span className="text-sm font-semibold text-neutral-450 hover:text-indigo-500">+</span>
                  </Link>
                </div>
                {selectedContact.tickets && selectedContact.tickets.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-none">
                    {selectedContact.tickets.map((t) => (
                      <div key={t.id} className="p-2 border border-border bg-white dark:bg-neutral-950 rounded-lg text-[10px] space-y-1">
                        <div className="flex items-center justify-between font-mono text-[8px] text-neutral-450">
                          <span>{t.id}</span>
                          <span className={`px-1 py-0.2 rounded font-extrabold uppercase ${
                            t.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400' : t.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400 animate-pulse' : 'bg-rose-500/10 text-rose-400'
                          }`}>{t.status}</span>
                        </div>
                        <p className="font-semibold text-foreground truncate">{t.subject}</p>
                        <p className="text-neutral-500 font-medium">{new Date(t.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 italic">No tickets yet.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full opacity-50 px-4 py-8 text-center">
              <User className="w-8 h-8 mb-3 text-neutral-400" />
              <p className="text-xs text-neutral-400">Select a conversation to view contact info</p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
