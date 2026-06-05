import type { Metadata } from 'next';
import { Shield, Mail, Database, Bot, Cookie, Clock, FileText, ArrowLeft } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Understand how InboxKura securely processes, processes using AI models, and safely stores customer communication data from integration channels.',
  alternates: {
    canonical: 'https://inboxkura.vercel.app/privacy',
  },
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto glass rounded-2xl shadow-sm overflow-hidden relative">
        <div className="absolute top-4 right-4 z-10"><ThemeToggle /></div>
        <div className="absolute top-4 left-4 z-10">
          <Link href="/" className="flex items-center text-sm font-medium text-neutral-500 hover:text-foreground transition-colors p-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Link>
        </div>
        <div className="px-8 py-10 sm:px-12 sm:py-14 mt-6">
          <div className="flex items-center space-x-4 mb-10">
            <Image src="/image.png" alt="InboxKura Logo" width={48} height={48} className="h-12 w-auto object-contain" />
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">Privacy Policy</h1>
          </div>
          
          <div className="space-y-10 text-neutral-600 dark:text-neutral-400 leading-relaxed">
            <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="space-y-4">
              <div className="flex items-center space-x-3 text-foreground">
                <Database className="h-6 w-6 text-primary" />
                <h2 className="font-bold text-2xl">Data Collection</h2>
              </div>
              <p>
                We collect messages, user profiles, and related metadata from your connected Facebook, Instagram, and WhatsApp business accounts via official Meta APIs, as well as connected TikTok business accounts via official TikTok APIs. This collection is limited to authorized business assets to support your customer communication workflows.
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center space-x-3 text-foreground">
                <Bot className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                <h2 className="font-bold text-2xl">Data Usage & AI Processing</h2>
              </div>
              <p>
                The collected messages are processed using our proprietary machine learning models and trusted third-party AI providers to offer sentiment analysis, categorization, and suggested responses. This processing is intended solely to enhance your inbox management experience. We do not use your personal messages to train public AI models.
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center space-x-3 text-foreground">
                <Shield className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                <h2 className="font-bold text-2xl">Data Storage & Sharing</h2>
              </div>
              <p>
                Messages are stored securely in our encrypted database infrastructure to provide a seamless unified inbox interface. We do not sell, rent, or trade your personal information or message data to any third parties, advertisers, or data brokers under any circumstances.
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center space-x-3 text-foreground">
                <Clock className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                <h2 className="font-bold text-2xl">Data Retention</h2>
              </div>
              <p>
                We retain your inbox data only for as long as your account remains active. If you choose to disconnect a channel or delete your account, we will permanently purge all associated messages and metadata from our servers within 30 days, in compliance with standard data retention policies.
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center space-x-3 text-foreground">
                <Cookie className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                <h2 className="font-bold text-2xl">Cookies & Tracking</h2>
              </div>
              <p>
                Our platform utilizes essential cookies to maintain your active session, store your preferences (such as light/dark mode), and protect against unauthorized access. We do not use intrusive tracking cookies or cross-site tracking pixels.
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center space-x-3 text-foreground">
                <FileText className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                <h2 className="font-bold text-2xl">User Rights (GDPR & CCPA)</h2>
              </div>
              <p>
                Depending on your location, you may have the right to request access to the personal data we hold about you, request corrections, or request deletion of your data (the &quot;Right to be Forgotten&quot;). You can exercise these rights at any time by contacting our privacy team.
              </p>
            </section>

            <section className="space-y-6 pt-8 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-3 text-foreground">
                <Mail className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                <h2 className="font-bold text-2xl">Contact Us</h2>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                <p className="text-foreground font-medium">
                  For privacy concerns, data export requests, or general inquiries:
                </p>
                <a href="mailto:privacy@inboxkura.com" className="inline-block mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold text-lg transition-colors">
                  privacy@inboxkura.com
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
