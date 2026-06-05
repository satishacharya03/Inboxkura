import type { Metadata } from 'next';
import { ExternalLink, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Data Deletion Instructions',
  description: 'Step-by-step instructions on how to request deletion or automatically purge your Facebook, Instagram, and other business connection data from the InboxKura platform.',
  alternates: {
    canonical: 'https://inboxkura.vercel.app/deletion',
  },
};

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto glass rounded-2xl shadow-sm overflow-hidden">
        
        {/* Header Hero */}
        <div className="bg-red-50 dark:bg-red-900/10 px-8 py-12 sm:px-12 border-b border-red-100 dark:border-red-900/20">
          <div className="flex items-center space-x-4 mb-4">
            <Image src="/image.png" alt="InboxKura Logo" width={48} height={48} className="h-12 w-auto object-contain" />
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Data Deletion
            </h1>
          </div>
          <p className="text-lg text-red-800/80 dark:text-red-200/80 max-w-2xl">
            We operate on a strict privacy-first architecture. You maintain full ownership of your data at all times. Below are the steps to completely purge your records from our servers.
          </p>
        </div>

        <div className="px-8 py-10 sm:px-12 sm:py-14 space-y-10">
          
          <section className="relative">
            <div className="flex items-center space-x-3 mb-4">
              <ShieldCheck className="h-6 w-6 text-blue-500 dark:text-blue-400" />
              <h2 className="text-foreground font-bold text-2xl">
                Option 1: Automated Deletion via Meta
              </h2>
            </div>
            <div className="bg-white/70 dark:bg-neutral-900/50 rounded-xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800">
              <p className="text-neutral-600 dark:text-neutral-300 mb-6">
                Removing the InboxKura app exactly from your Facebook settings will trigger a webhook to our servers, automatically purging your database records within moments.
              </p>
              
              <ol className="space-y-4 mb-8">
                {[
                  "Navigate to your Facebook account's Settings & Privacy.",
                  "Click on Settings, then scroll to Apps and Websites.",
                  "Locate our application in your list of active platform apps.",
                  "Click the Remove button and confirm."
                ].map((step, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-bold mr-3 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-neutral-700 dark:text-neutral-200">{step}</span>
                  </li>
                ))}
              </ol>

              <a 
                href="https://www.facebook.com/settings?tab=applications" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm"
              >
                <span>Go to Meta App Settings</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </section>

          <section className="border-t border-gray-100 dark:border-gray-800 pt-10">
            <div className="flex items-center space-x-3 mb-4">
              <Mail className="h-6 w-6 text-neutral-500 dark:text-neutral-400" />
              <h2 className="text-foreground font-bold text-2xl">
                Option 2: Manual Compliance Request
              </h2>
            </div>
            <p className="text-neutral-600 dark:text-neutral-300 mb-6">
              Alternatively, you can file a formal data deletion request with our support team. We process these requests within 72 hours in compliance with GDPR.
            </p>
            <div className="flex items-center">
              <a 
                href="mailto:privacy@inboxkura.com?subject=Data Deletion Request" 
                className="group flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold text-lg transition-colors"
              >
                <span>privacy@inboxkura.com</span>
                <ArrowRight className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
