import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker';

export const metadata: Metadata = {
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'InboxKura',
  },
  metadataBase: new URL('https://inboxkura.vercel.app'),
  title: {
    default: 'InboxKura — AI-Powered Unified Social Inbox',
    template: '%s | InboxKura',
  },
  description: 'Manage Facebook, Instagram, WhatsApp, Telegram, and TikTok messages in one unified dashboard. Let Gemini AI analyze sentiment, categorize intent, and draft replies.',
  keywords: [
    'unified inbox',
    'AI messaging',
    'social media inbox',
    'Gemini AI inbox',
    'customer support software',
    'Facebook inbox',
    'Instagram DM inbox',
    'WhatsApp business API',
    'Telegram business API',
    'TikTok business inbox',
    'sentiment analysis support',
    'auto-suggest replies',
    'InboxKura',
    'sambad',
    'io',
    'kura kani',
    'kurakani',
    'omni dashboard',
    'related messaging',
    'omni messaging',
    'sambad io',
  ],
  authors: [{ name: 'InboxKura Team', url: 'https://inboxkura.vercel.app' }],
  creator: 'InboxKura',
  publisher: 'InboxKura',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'GPcAMvoJqIiDxD5OD-H1As13QpgXIFrcuy0sChrji6Y',
    other: {
      'msvalidate.01': 'B28F700D4AFA443267E86563FFB0320F',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://inboxkura.vercel.app',
    siteName: 'InboxKura',
    title: 'InboxKura — AI-Powered Unified Social Inbox',
    description: 'Manage all your social messages in one place with Gemini AI-powered sentiment analysis and automated reply drafts.',
    images: [
      {
        url: '/image.png',
        width: 1200,
        height: 630,
        alt: 'InboxKura — AI-Powered Unified Inbox Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'InboxKura — AI-Powered Unified Social Inbox',
    description: 'Manage all your social messages in one place with Gemini AI-powered sentiment analysis and automated reply drafts.',
    images: ['/image.png'],
  },
  alternates: {
    canonical: 'https://inboxkura.vercel.app',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': 'InboxKura',
    'operatingSystem': 'All',
    'applicationCategory': 'BusinessApplication',
    'description': 'Manage Facebook, Instagram, WhatsApp, Telegram, and TikTok messages in one unified dashboard with Gemini AI-powered sentiment analysis and auto-suggested replies.',
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD',
    },
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': '4.9',
      'ratingCount': '128',
    },
  };

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="h-full bg-background text-foreground antialiased transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
