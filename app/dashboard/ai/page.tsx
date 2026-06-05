'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Bot, Sparkles, BookOpen, ChevronRight, Zap, CheckCircle2, Circle, Edit2, X, Plus, Trash2, Save, HelpCircle, Menu } from 'lucide-react';
import { LeftSidebar, DEFAULT_PLATFORMS } from '@/app/dashboard/components/LeftSidebar';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

// ---- Knowledge Base Types ----
type FAQ = { q: string; a: string };
type KnowledgeBase = {
  legalName: string;
  tagline: string;
  website: string;
  supportEmail: string;
  supportPhone: string;
  operatingHours: string;
  address: string;
  about: string;
  faqs: FAQ[];
  updates: string;
};

const KB_DEFAULTS: KnowledgeBase = {
  legalName: '',
  tagline: '',
  website: '',
  supportEmail: '',
  supportPhone: '',
  operatingHours: '',
  address: '',
  about: '',
  faqs: [],
  updates: '',
};

type AiSettings = {
  aiLanguage: string;
  audioTranscriptions: boolean;
  imageUnderstanding: boolean;
  handoffTriggers: string[];
  autoCreateTicket: boolean;
};

export default function AiSettingsPage() {
  const { data: aiSettings, mutate: mutateAiSettings } = useSWR<AiSettings>('/api/orgs/ai-settings', fetcher);
  const { data: orgData, mutate: mutateOrgs } = useSWR('/api/orgs', fetcher);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  
  // Knowledge Base modal states
  const [kbModalOpen, setKbModalOpen] = useState(false);
  const [kbTab, setKbTab] = useState<'identity' | 'faqs' | 'updates'>('identity');
  const [kb, setKb] = useState<KnowledgeBase>(KB_DEFAULTS);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbSaving, setKbSaving] = useState(false);

  // AI environment states
  const [aiLanguage, setAiLanguage] = useState('Auto-detect');
  const [audioTranscriptions, setAudioTranscriptions] = useState(true);
  const [imageUnderstanding, setImageUnderstanding] = useState(true);
  const [handoffTriggers, setHandoffTriggers] = useState<string[]>([]);
  const [autoCreateTicket, setAutoCreateTicket] = useState(true);

  const [newTriggerInput, setNewTriggerInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // Sync state when DB settings load
  useEffect(() => {
    if (aiSettings) {
      setAiLanguage(aiSettings.aiLanguage || 'Auto-detect');
      setAudioTranscriptions(aiSettings.audioTranscriptions !== undefined ? aiSettings.audioTranscriptions : true);
      setImageUnderstanding(aiSettings.imageUnderstanding !== undefined ? aiSettings.imageUnderstanding : true);
      setHandoffTriggers(aiSettings.handoffTriggers || []);
      setAutoCreateTicket(aiSettings.autoCreateTicket !== undefined ? aiSettings.autoCreateTicket : true);
    }
  }, [aiSettings]);

  // Load Knowledge Base details on modal open
  useEffect(() => {
    if (!kbModalOpen) return;
    setKbLoading(true);
    fetch('/api/orgs/knowledge-base')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.knowledgeBase) {
          const kbData = data.knowledgeBase;
          setKb({
            legalName: kbData.legalName || '',
            tagline: kbData.tagline || '',
            website: kbData.website || '',
            supportEmail: kbData.supportEmail || '',
            supportPhone: kbData.supportPhone || '',
            operatingHours: kbData.operatingHours || '',
            address: kbData.address || '',
            about: kbData.about || '',
            faqs: Array.isArray(kbData.faqs) ? kbData.faqs : [],
            updates: kbData.updates || '',
          });
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setKbLoading(false));
  }, [kbModalOpen]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // Save AI Settings to API
  const handleSaveSettings = async (updates: Partial<AiSettings>) => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/orgs/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        mutateAiSettings();
      } else {
        const errData = await res.json();
        showToast('error', errData.error || 'Failed to update AI settings.');
      }
    } catch {
      showToast('error', 'Network error while updating AI settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveKb = async () => {
    setKbSaving(true);
    try {
      const res = await fetch('/api/orgs/knowledge-base', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kb),
      });
      if (res.ok) {
        showToast('success', 'Knowledge base saved successfully!');
        setKbModalOpen(false);
      } else {
        const errData = await res.json();
        showToast('error', errData.error || 'Failed to save knowledge base.');
      }
    } catch {
      showToast('error', 'Network error. Could not save knowledge base.');
    } finally {
      setKbSaving(false);
    }
  };

  // AI settings update handlers
  const handleLanguageChange = (lang: string) => {
    setAiLanguage(lang);
    handleSaveSettings({ aiLanguage: lang });
  };

  const handleAudioToggle = (enabled: boolean) => {
    setAudioTranscriptions(enabled);
    handleSaveSettings({ audioTranscriptions: enabled });
  };

  const handleImageToggle = (enabled: boolean) => {
    setImageUnderstanding(enabled);
    handleSaveSettings({ imageUnderstanding: enabled });
  };

  const handleTicketToggle = (enabled: boolean) => {
    setAutoCreateTicket(enabled);
    handleSaveSettings({ autoCreateTicket: enabled });
  };

  const handleAddTrigger = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTriggerInput.trim()) {
      e.preventDefault();
      const cleanVal = newTriggerInput.trim().toLowerCase();
      if (!handoffTriggers.includes(cleanVal)) {
        const newTriggers = [...handoffTriggers, cleanVal];
        setHandoffTriggers(newTriggers);
        handleSaveSettings({ handoffTriggers: newTriggers });
      }
      setNewTriggerInput('');
    }
  };

  const handleRemoveTrigger = (trigger: string) => {
    const newTriggers = handoffTriggers.filter(t => t !== trigger);
    setHandoffTriggers(newTriggers);
    handleSaveSettings({ handoffTriggers: newTriggers });
  };

  const addFaq = () => setKb((prev) => ({ ...prev, faqs: [...prev.faqs, { q: '', a: '' }] }));
  const removeFaq = (i: number) => setKb((prev) => ({ ...prev, faqs: prev.faqs.filter((_, idx) => idx !== i) }));
  const updateFaq = (i: number, field: 'q' | 'a', val: string) =>
    setKb((prev) => ({ ...prev, faqs: prev.faqs.map((f, idx) => (idx === i ? { ...f, [field]: val } : f)) }));

  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-background text-foreground"
      style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
    >
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 flex items-center gap-2 px-4.5 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl animate-in slide-in-from-right-4 duration-300 ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-650 dark:text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/35 text-rose-650 dark:text-rose-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
          <span className="text-xs font-semibold">{toast.msg}</span>
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
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold tracking-tight text-foreground">AI Settings</span>
            </div>
          </div>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto bg-background/50">
          <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
            {/* Business knowledge */}
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground/80" /> Business knowledge
                </h2>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Teach the AI about your business — identity, tone of voice, offerings, FAQs, and how to handle tricky situations.
                </p>
              </div>

              <div className="grid gap-3">
                {/* Business Knowledge Base card */}
                <div className="flex items-center justify-between p-5 bg-surface/50 hover:bg-surface-muted/50 border border-border rounded-2xl transition-all group relative">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
                      <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Business Knowledge Base</h4>
                      <p className="text-xs text-muted-foreground max-w-xl">
                        Identity, voice, offerings, FAQs and playbook — everything the AI needs to sound like your team.
                      </p>
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-muted border border-border text-[9px] font-bold text-muted-foreground">
                          5 sections
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-bold text-indigo-600 dark:text-indigo-450 uppercase tracking-wider">
                          AI assisted
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setKbModalOpen(true)}
                    className="p-2 rounded-xl bg-surface border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0 cursor-pointer"
                    title="Edit Knowledge Base"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Custom Tools placeholder card */}
                <div className="flex items-center justify-between p-5 bg-surface/30 border border-border rounded-2xl opacity-75 group">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20 shrink-0">
                      <Sparkles className="w-5 h-5 text-pink-500 dark:text-pink-400" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground">Custom tools</h4>
                      <p className="text-xs text-muted-foreground max-w-xl">
                        Extend the AI with merchant-defined tools — static replies or HTTP calls to your own services. Perfect for order-status lookups, warranty checks, or custom Q&A.
                      </p>
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-muted border border-border text-[9px] font-bold text-muted-foreground">
                          Up to 5 tools
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-pink-500/10 border border-pink-500/20 text-[9px] font-bold text-pink-500 dark:text-pink-400">
                          1 credit per call
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/60 shrink-0" />
                </div>
              </div>
            </section>

            {/* AI environment */}
            <section className="bg-surface/30 border border-border rounded-3xl p-6 md:p-8 space-y-6">
              <div className="border-b border-border pb-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> AI environment
                </h2>
              </div>

              {/* Language Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Language</label>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { id: 'English', label: 'English', desc: 'Always respond in English' },
                    { id: 'Nepali', label: 'Nepali', desc: 'Always respond in romanized Nepali' },
                    { id: 'Auto-detect', label: 'Auto-detect', desc: 'Match the language the user writes in' },
                  ].map((lang) => {
                    const selected = aiLanguage === lang.id;
                    return (
                      <button
                        key={lang.id}
                        onClick={() => handleLanguageChange(lang.id)}
                        className={`flex flex-col text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                          selected
                            ? 'bg-indigo-650/10 dark:bg-indigo-600/10 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-lg shadow-indigo-500/10'
                            : 'bg-surface border-border text-muted-foreground hover:bg-surface-muted hover:text-foreground'
                        }`}
                      >
                        <span className="text-xs font-bold flex items-center justify-between w-full">
                          {lang.label}
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${selected ? 'border-indigo-500 text-indigo-500' : 'border-border'}`}>
                            {selected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                          </span>
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-1 leading-normal">{lang.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Audio Transcriptions toggle */}
              <div className="flex items-center justify-between gap-4 py-1">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-foreground">Audio transcriptions</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Transcribe voice messages automatically. <span className="text-amber-600 dark:text-amber-500/90 font-semibold">Costs 2 credits per message.</span>
                  </p>
                </div>
                <button
                  onClick={() => handleAudioToggle(!audioTranscriptions)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out items-center px-0.5 ${
                    audioTranscriptions ? 'bg-indigo-600' : 'bg-muted'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${audioTranscriptions ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="h-px bg-border" />

              {/* Image understanding toggle */}
              <div className="flex items-center justify-between gap-4 py-1">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-foreground">Image understanding</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Read product photos, screenshots, and payment receipts the customer sends. Includes any text visible in the image (TXN IDs, amounts, dates). <span className="text-amber-600 dark:text-amber-500/90 font-semibold">Costs 3 credits per image.</span>
                  </p>
                </div>
                <button
                  onClick={() => handleImageToggle(!imageUnderstanding)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out items-center px-0.5 ${
                    imageUnderstanding ? 'bg-indigo-600' : 'bg-muted'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${imageUnderstanding ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="h-px bg-border" />

              {/* Handoff triggers */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-foreground">Human handoff triggers</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  When a user sends any of these phrases, the conversation is handed off to a human agent and auto-reply is disabled.
                </p>
                
                <div className="flex flex-wrap gap-2 p-3 bg-background border border-border rounded-2xl">
                  {handoffTriggers.map((trigger) => (
                    <span
                      key={trigger}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted border border-border text-xs font-semibold text-foreground select-none hover:bg-surface-muted transition-colors"
                    >
                      {trigger}
                      <button
                        onClick={() => handleRemoveTrigger(trigger)}
                        className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  
                  <input
                    type="text"
                    placeholder="Add another..."
                    value={newTriggerInput}
                    onChange={e => setNewTriggerInput(e.target.value)}
                    onKeyDown={handleAddTrigger}
                    className="bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none py-1 px-2.5 max-w-[120px]"
                  />
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Auto-create ticket on handoff toggle */}
              <div className="flex items-center justify-between gap-4 py-1">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-foreground">Auto-create ticket on handoff</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Automatically creates a support ticket when AI escalates to a human, so your team has a record to follow up.
                  </p>
                </div>
                <button
                  onClick={() => handleTicketToggle(!autoCreateTicket)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out items-center px-0.5 ${
                    autoCreateTicket ? 'bg-indigo-600' : 'bg-muted'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoCreateTicket ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* Knowledge Base Modal */}
      {kbModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setKbModalOpen(false)}
        >
          <div
            className="bg-surface border border-border rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-250 text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Business Knowledge Base</h2>
                  <p className="text-[11px] text-muted-foreground">AI source of truth for customer replies</p>
                </div>
              </div>
              <button
                onClick={() => setKbModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-xl hover:bg-muted border border-transparent cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-border px-6">
              {(['identity', 'faqs', 'updates'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setKbTab(t)}
                  className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all capitalize cursor-pointer ${
                    kbTab === t
                      ? 'border-indigo-500 text-indigo-650 dark:text-indigo-400 font-bold'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t === 'identity' ? 'Identity' : t === 'faqs' ? 'FAQs' : 'Updates'}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {kbLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : kbTab === 'identity' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {([
                      ['legalName', 'Legal Name', 'text', 'Acme Corp Ltd.'],
                      ['tagline', 'Tagline / One-line pitch', 'text', 'We make X easier for Y'],
                      ['website', 'Website', 'url', 'https://example.com'],
                      ['supportEmail', 'Support Email', 'email', 'support@example.com'],
                      ['supportPhone', 'Support Phone', 'tel', '+1 234 567 8900'],
                      ['operatingHours', 'Operating Hours', 'text', 'Mon–Fri 9am–6pm'],
                    ] as [keyof KnowledgeBase, string, string, string][]).map(([field, label, type, placeholder]) => (
                      <div key={field}>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
                        <input
                          type={type}
                          value={kb[field] as string}
                          onChange={(e) => setKb((prev) => ({ ...prev, [field]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Address</label>
                    <input
                      type="text"
                      value={kb.address}
                      onChange={(e) => setKb((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="123 Main St, City, Country"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">About the Business</label>
                    <textarea
                      rows={4}
                      value={kb.about}
                      onChange={(e) => setKb((prev) => ({ ...prev, about: e.target.value }))}
                      placeholder="Describe what your business does, your products/services, your values, and what makes you unique…"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none leading-relaxed"
                    />
                  </div>
                </div>
              ) : kbTab === 'faqs' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 gap-4">
                    <p className="text-xs text-muted-foreground">Add frequently asked questions to help the AI answer customers accurately.</p>
                    <button
                      onClick={addFaq}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-semibold transition-colors shadow-lg cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add FAQ
                    </button>
                  </div>
                  {kb.faqs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <BookOpen className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-xs font-semibold">No FAQs yet. Add your first one!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {kb.faqs.map((faq, i) => (
                        <div key={i} className="rounded-2xl border border-border bg-surface-muted/30 p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold text-indigo-605 dark:text-indigo-400 uppercase tracking-wider">FAQ #{i + 1}</span>
                            <button onClick={() => removeFaq(i)} className="text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={faq.q}
                            onChange={(e) => updateFaq(i, 'q', e.target.value)}
                            placeholder="Question"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-indigo-500/50 transition-colors"
                          />
                          <textarea
                            rows={2}
                            value={faq.a}
                            onChange={(e) => updateFaq(i, 'a', e.target.value)}
                            placeholder="Answer"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-indigo-500/50 resize-none transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">Share recent updates, promotions, or changes the AI should know about.</p>
                  <textarea
                    rows={8}
                    value={kb.updates}
                    onChange={(e) => setKb((prev) => ({ ...prev, updates: e.target.value }))}
                    placeholder="e.g. We launched a new product line in May 2026. We now offer free shipping on orders over $50. Our support hours changed to 8am–8pm…"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none leading-relaxed"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-muted/20">
              <button
                onClick={() => setKbModalOpen(false)}
                className="px-4.5 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveKb}
                disabled={kbSaving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-650 text-white text-xs font-semibold transition-opacity shadow-lg shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
              >
                {kbSaving ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {kbSaving ? 'Saving…' : 'Save Knowledge Base'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

