import Link from 'next/link';
import { BookOpen, Code, Layers, Settings, ShieldCheck, Zap } from 'lucide-react';

export default function DocsIndexPage() {
  return (
    <div className="space-y-10 py-4 max-w-3xl">
      {/* Intro Hero Section */}
      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">Reply AI Docs</span>
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          Configure integrations, set up communication channels, and leverage our robust developer API to build automated conversational workflows for your business.
        </p>
      </div>

      {/* Grid of Main Sections */}
      <div className="grid sm:grid-cols-2 gap-6">
        
        {/* Card 1: Channel Connections */}
        <Link
          href="/docs/connection"
          className="group relative overflow-hidden bg-surface/40 hover:bg-surface/60 border border-border/80 hover:border-indigo-500/30 rounded-3xl p-6 transition-all duration-300 shadow-sm flex flex-col justify-between space-y-8"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-transparent blur-xl" />
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Channel Connections
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Step-by-step setup guides to securely link Facebook Messenger, Instagram Direct, WhatsApp Cloud API, TikTok, and Telegram Business into your workspace.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500 group-hover:translate-x-1 transition-transform flex items-center gap-1">
            Configure Channels &rarr;
          </span>
        </Link>

        {/* Card 2: Developer API */}
        <Link
          href="/docs/api"
          className="group relative overflow-hidden bg-surface/40 hover:bg-surface/60 border border-border/80 hover:border-purple-500/30 rounded-3xl p-6 transition-all duration-300 shadow-sm flex flex-col justify-between space-y-8"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-transparent blur-xl" />
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
              <Code className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Developer API & Webhooks
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Integrate the AI auto-responder into custom custom-built applications, verify secret API keys, send raw message payloads, and configure outbound webhooks.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-500 group-hover:translate-x-1 transition-transform flex items-center gap-1">
            Read API Docs &rarr;
          </span>
        </Link>

      </div>

      {/* Quick Start Guide Section */}
      <div className="bg-surface/30 border border-border/80 rounded-3xl p-6 md:p-8 space-y-6">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-500" /> Auto-Responder Quick Setup
        </h3>
        
        <div className="grid md:grid-cols-3 gap-6 text-xs text-muted-foreground leading-relaxed">
          <div className="space-y-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 font-bold">1</span>
            <h5 className="font-bold text-foreground text-xs">Connect Channels</h5>
            <p className="text-[11px]">Authorize social messaging APIs in your dashboard integration tab to feed live conversations into the inbox.</p>
          </div>
          <div className="space-y-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 font-bold">2</span>
            <h5 className="font-bold text-foreground text-xs">Configure AI Persona</h5>
            <p className="text-[11px]">Go to settings and configure your AI's auto-reply tone (e.g. professional, warm, or custom AI-tilted guidelines).</p>
          </div>
          <div className="space-y-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 font-bold">3</span>
            <h5 className="font-bold text-foreground text-xs">Enable Auto-Reply</h5>
            <p className="text-[11px]">Toggle "Auto-reply" on your platform configuration to let the Gemini model reply to customers instantly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
