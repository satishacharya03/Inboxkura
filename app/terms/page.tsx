import type { Metadata } from 'next';
import { AlertCircle, UserCheck, Activity, Ban, ArrowLeft } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Read the Terms of Service for using the InboxKura platform, including business usage regulations, AI response drafting guidelines, and service level descriptions.',
  alternates: {
    canonical: 'https://inboxkura.vercel.app/terms',
  },
};

export default function TermsOfService() {
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
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">Terms of Service</h1>
          </div>
          
          <div className="space-y-10 text-neutral-600 dark:text-neutral-400 leading-relaxed">
            <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="space-y-4">
              <div className="flex items-center space-x-3 text-foreground">
                <UserCheck className="h-6 w-6 text-primary" />
                <h2 className="font-bold text-2xl">1. Business Use & Authorization</h2>
              </div>
              <p>
                InboxKura is a business communication suite built for teams and organizations. By utilizing this platform and connecting a Facebook, Instagram, WhatsApp, or TikTok business account, you represent that you are authorized to manage these operations on behalf of your organization. Connecting personal or unauthorized third-party accounts is strictly prohibited.
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center space-x-3 text-foreground">
                <AlertCircle className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                <h2 className="font-bold text-2xl">2. AI Suggestions & Guidance</h2>
              </div>
              <p>
                Our service utilizes advanced Artificial Intelligence capabilities to analyze sentiment, categorize messages, and suggest replies. These AI-generated suggestions are strictly provided for guidance purposes. You are solely responsible for reviewing, modifying, and verifying any automated responses before sending them. We do not guarantee the factual accuracy, tone appropriateness, or context of AI-generated content.
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center space-x-3 text-foreground">
                <Activity className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                <h2 className="font-bold text-2xl">3. Service Availability & Limits</h2>
              </div>
              <p>
                We strive to maintain high-availability access to our services, but we do not guarantee completely uninterrupted availability. Your usage of InboxKura is subject to underlying API rate limits imposed by Meta, TikTok, OpenAI, or other integrated platforms. We reserve the right to throttle usage or temporarily suspend accounts that exceed acceptable fair-use thresholds.
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center space-x-3 text-foreground">
                <Ban className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                <h2 className="font-bold text-2xl">4. Prohibited Conduct</h2>
              </div>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Using the platform for spam, phishing, or unsolicited mass messaging.</li>
                <li>Attempting to bypass our security measures or reverse engineer the service.</li>
                <li>Using our AI to generate hate speech, explicit content, or illegal material.</li>
              </ul>
            </section>

            <section className="space-y-6 pt-8 border-t border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-2xl text-foreground">Contact & Support</h2>
              <div className="bg-white/70 dark:bg-neutral-900/50 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800">
                <p className="mb-2">
                  For legal inquiries regarding these Terms of Service, please reach out to our legal team:
                </p>
                <a href="mailto:legal@inboxkura.com" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold transition-colors">
                  legal@inboxkura.com
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
