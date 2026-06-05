'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Menu,
  X,
  BookOpen,
  ArrowLeft,
  Code,
  Layers,
  MessageSquare,
  Send,
  Zap,
} from 'lucide-react';
import {
  FacebookIcon,
  InstagramIcon,
  WhatsAppIcon,
  TikTokIcon,
  TelegramIcon,
} from '@/app/dashboard/components/dashboard-ui';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeHash, setActiveHash] = useState('');

  useEffect(() => {
    // Sync initially
    setActiveHash(window.location.hash);

    const handleHashChange = () => {
      setActiveHash(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [pathname]);

  const navigation = [
    {
      title: 'Overview',
      items: [
        { name: 'Introduction', href: '/docs', icon: BookOpen },
      ],
    },
    {
      title: 'Channel Connections',
      items: [
        { name: 'Facebook Messenger', href: '/docs/connection#fb', icon: FacebookIcon },
        { name: 'Instagram Direct', href: '/docs/connection#ig', icon: InstagramIcon },
        { name: 'WhatsApp Business', href: '/docs/connection#wa', icon: WhatsAppIcon },
        { name: 'TikTok Messaging', href: '/docs/connection#tiktok', icon: TikTokIcon },
        { name: 'Telegram Business', href: '/docs/connection#telegram', icon: TelegramIcon },
      ],
    },
    {
      title: 'Developer API',
      items: [
        { name: 'API & Webhooks', href: '/docs/api', icon: Code },
      ],
    },
  ];

  const isActive = (href: string) => {
    const [path, linkHash] = href.split('#');
    
    if (pathname !== path) {
      return false;
    }
    
    if (linkHash) {
      return activeHash === `#${linkHash}`;
    }
    
    return !activeHash;
  };

  const SidebarContent = () => (
    <div className="space-y-6">
      {navigation.map((group) => (
        <div key={group.title} className="space-y-2">
          <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60 px-3">
            {group.title}
          </h4>
          <nav className="space-y-1">
            {group.items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all border ${
                    active
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-indigo-500' : 'text-muted-foreground/60'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col font-sans" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      
      {/* Unified Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-xl px-4 md:px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          {/* Mobile hamburger menu */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 -ml-2 rounded-xl hover:bg-muted text-foreground transition-colors"
            aria-label="Toggle Documentation Navigation"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/dashboard/integrations" className="hidden md:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all group font-medium">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Integrations
          </Link>
          <div className="hidden md:block h-4 w-px bg-border" />
          
          <Link href="/docs" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground">Reply AI Docs</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-500 text-white transition-all shadow-sm">
            Go to App
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 flex gap-8 py-8 relative">
        
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 scrollbar-thin">
          <SidebarContent />
        </aside>

        {/* Mobile Navigation Sidebar Drawer */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop overlay */}
            <div
              className="md:hidden fixed inset-0 bg-black/55 z-40 top-[69px]"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Drawer container */}
            <aside className="md:hidden fixed left-0 top-[69px] bottom-0 w-72 bg-background border-r border-border p-6 z-50 overflow-y-auto animate-in slide-in-from-left duration-300">
              <div className="mb-4">
                <Link href="/dashboard/integrations" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground py-2 mb-2 font-medium">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Integrations
                </Link>
              </div>
              <SidebarContent />
            </aside>
          </>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 max-w-4xl mx-auto md:mx-0">
          <div className="animate-in fade-in duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
