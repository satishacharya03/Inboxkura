/* eslint-disable react/no-unescaped-entities */
"use client";

import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  MessageCircle,
  Zap,
  Send,
} from 'lucide-react';

// Custom SVG Icons
function FacebookIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function WhatsAppIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function SendIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
    </svg>
  );
}

function TikTokIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64c.3 0 .6.05.89.14V9.4a6.34 6.34 0 00-.89-.06A6.33 6.33 0 003.16 15.65a6.34 6.34 0 0010.86 4.43 6.28 6.28 0 001.76-4.4V8.56a8.2 8.2 0 004.81 1.54V6.69z" />
    </svg>
  );
}

export default function ConnectionDocs() {
  return (
    <div className="space-y-16 max-w-3xl">
      {/* Header intro */}
      <div className="space-y-4 border-b border-border pb-8">
        <h1 className="text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
          Integrations & <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Connections</span>
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          Our application integrates securely with multiple social and messaging channels using automated OAuth flows. Follow the guides below to connect your channels directly into your unified workspace inbox.
        </p>
      </div>

      {/* FB Section */}
      <section id="fb" className="space-y-6 scroll-mt-24">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
            <FacebookIcon className="w-5 h-5 text-blue-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Facebook Messenger Setup</h2>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Receive and send Facebook Messenger conversations straight to your customer support inbox using secure, official Meta OAuth login.
        </p>
        
        <div className="space-y-4 p-6 bg-white dark:bg-neutral-900 border border-border rounded-2xl shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">Step-by-Step Instructions</h4>
          <ul className="space-y-4 text-sm text-neutral-600 dark:text-neutral-300">
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs mt-0.5">1</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Ensure You Have a Facebook Page</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ensure you are an administrator of the Facebook Page you wish to connect (Personal Facebook profiles cannot receive business messages).
                </p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs mt-0.5">2</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Start the Authorization Flow</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Go to the **Integrations** tab in your dashboard, select **Facebook Messenger**, and click the **"Connect"** button.
                </p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs mt-0.5">3</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Authorize Meta Permissions</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Log in with your Meta account in the secure pop-up. Click <b>"Edit Settings"</b> to select the specific Facebook Pages you want to link. Grant permissions to manage messaging.
                </p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs mt-0.5">4</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Automatic Sync</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Once authorized, our system automatically configures the webhooks and starts syncing your messages to the workspace.
                </p>
              </div>
            </li>
          </ul>

          <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
            <p className="font-bold mb-1.5 flex items-center gap-1">⚠️ Note for Multiple Facebook Pages</p>
            <p className="leading-relaxed">If you manage multiple Facebook Pages, click <b>"Edit Settings"</b> during the Meta login popup and select <b>ONLY</b> the specific page you want to connect to this workspace. Otherwise, the first page found will be connected.</p>
          </div>
        </div>
      </section>

      {/* IG Section */}
      <section id="ig" className="space-y-6 scroll-mt-24">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-600/10 border border-pink-500/20 flex items-center justify-center">
            <InstagramIcon className="w-5 h-5 text-pink-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Instagram Direct Setup</h2>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Receive DMs, story mentions, and replies straight into your dashboard. Our integration uses secure Meta logins for Professional/Business accounts.
        </p>

        <div className="space-y-4 p-6 bg-white dark:bg-neutral-900 border border-border rounded-2xl shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">Step-by-Step Instructions</h4>
          <ul className="space-y-4 text-sm text-neutral-600 dark:text-neutral-300">
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center font-bold text-xs mt-0.5">1</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Convert to Professional/Business Account</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Only Instagram Professional (Business or Creator) accounts are supported by Meta's messaging API. Open Instagram on your phone, go to <i>Settings & Privacy &rarr; Account Type and Tools</i>, and switch to a Professional account.
                </p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center font-bold text-xs mt-0.5">2</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Link Instagram to a Facebook Page</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Navigate to your Instagram profile, select <i>Edit Profile</i>, go to <i>Page</i>, and connect or create a Facebook Page.
                </p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center font-bold text-xs mt-0.5">3</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Enable "Allow Access to Messages"</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  In the Instagram mobile app, navigate to <i>Settings and Privacy &rarr; Messages and Story Replies &rarr; Message Controls</i>. Toggle **ON** "Allow Access to Messages". This grants permission for third-party inboxes to receive your messages.
                </p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center font-bold text-xs mt-0.5">4</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Secure Connect</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click the **"Connect"** button under Instagram Direct. Login via the official Meta screen, select the page linked to your Instagram, and allow messaging permissions.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* WA Section */}
      <section id="wa" className="space-y-6 scroll-mt-24">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
            <WhatsAppIcon className="w-5 h-5 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">WhatsApp Business Setup</h2>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Connect your business profile phone number through the official WhatsApp Business Cloud API using Meta's Embedded Onboarding flow.
        </p>

        <div className="space-y-4 p-6 bg-white dark:bg-neutral-900 border border-border rounded-2xl shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">Step-by-Step Instructions</h4>
          <ul className="space-y-4 text-sm text-neutral-600 dark:text-neutral-300">
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs mt-0.5">1</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Prepare a WhatsApp Business Number</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Make sure you have a phone number ready. It must not be currently active on standard personal or business WhatsApp mobile apps (if it is, you must delete the account from the mobile app first).
                </p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs mt-0.5">2</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Launch Onboarding Pop-up</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click the **"Connect"** button under WhatsApp in integrations. This launches the secure **Meta Embedded Onboarding flow** window.
                </p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs mt-0.5">3</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Select Business & Verify Number</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select your Meta Business Portfolio, choose to create or link a WhatsApp Business Profile, enter your phone number, and verify it via SMS or Phone Call.
                </p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs mt-0.5">4</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Instant Sync</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Once onboarded, the system fetches your Phone Number ID and connects your chats. No manual webhook configurations are required.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* TikTok Section */}
      <section id="tiktok" className="space-y-6 scroll-mt-24">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700/50 flex items-center justify-center">
            <TikTokIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">TikTok Messaging API Setup</h2>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Link your verified TikTok Business Account DMs and user conversations directly to the inbox workspace.
        </p>

        <div className="space-y-4 p-6 bg-white dark:bg-neutral-900 border border-border rounded-2xl shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">Step-by-Step Instructions</h4>
          <ul className="space-y-4 text-sm text-neutral-600 dark:text-neutral-300">
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 flex items-center justify-center font-bold text-xs mt-0.5">1</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Switch to a TikTok Business Account</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The TikTok messaging API is strictly reserved for Business accounts. In the TikTok mobile app, navigate to your <i>Profile &rarr; 3-line top-right menu &rarr; Settings and Privacy &rarr; Account &rarr; Switch to Business Account</i>. Follow the prompts to finish.
                </p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 flex items-center justify-center font-bold text-xs mt-0.5">2</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Click Connect TikTok</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Navigate to your Integrations tab, find TikTok, and click the **"Connect"** button.
                </p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 flex items-center justify-center font-bold text-xs mt-0.5">3</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Authorize the Connection</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Log in with your TikTok Business Account credentials on the official secure TikTok authorization screen and grant access to direct messaging.
                </p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 flex items-center justify-center font-bold text-xs mt-0.5">4</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Instant Activation</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You will be redirected back, and the TikTok integration will be immediately active. All new incoming messages will synchronize to your inbox.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Telegram Section */}
      <section id="telegram" className="space-y-6 scroll-mt-24">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600/10 border border-sky-500/20 flex items-center justify-center">
            <SendIcon className="w-5 h-5 text-sky-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Telegram Business Chatbot Integration</h2>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Connect your personal Telegram account to your team inbox via Telegram Business. Messages sent to your personal chat will be received and replied to directly from your workspace.
        </p>

        <div className="space-y-4 p-6 bg-white dark:bg-neutral-900 border border-border rounded-2xl shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">Step-by-Step Instructions</h4>
          <ul className="space-y-4 text-sm text-neutral-600 dark:text-neutral-300">
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold text-xs mt-0.5">1</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Enable Telegram Business</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Telegram Business requires a **Telegram Premium** subscription. Subscribe via your phone's Telegram app and verify that "Telegram Business" settings appear in your profile.
                </p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold text-xs mt-0.5">2</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Open Business Chatbots Setting</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  In your Telegram mobile or desktop application, open <i>Settings &rarr; Telegram Business &rarr; Chatbots</i>.
                </p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold text-xs mt-0.5">3</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Connect the Inbox Bot</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Search for our official bot handle: **<b><a href="https://t.me/InboxKuraBot" target="_blank" rel="noreferrer" className="text-sky-500 hover:underline">@InboxKuraBot</a></b>** in Telegram. Start the conversation with the bot, or click **"Connect Telegram"** in settings.
                </p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold text-xs mt-0.5">4</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Save Business Connection ID</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Telegram will establish a connection and present you with a **Business Connection ID** (format: <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded font-mono text-[10px]">conn_...</code>). Copy that ID, paste it into the Telegram Business Connection ID field in your settings, and save.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
