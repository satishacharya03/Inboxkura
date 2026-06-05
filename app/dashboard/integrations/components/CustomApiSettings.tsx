import { useState } from 'react';
import useSWR from 'swr';
import { Loader2, Key, Globe, Copy, CheckCircle2 } from 'lucide-react';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export function CustomApiSettings({ isAdmin }: { isAdmin: boolean }) {
  const { data, mutate } = useSWR('/api/orgs/api-settings', fetcher);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  
  const [copiedKey, setCopiedKey] = useState(false);

  // Initialize webhookUrl once data is loaded
  useState(() => {
    if (data?.apiWebhookUrl) setWebhookUrl(data.apiWebhookUrl);
  });
  // Update state when data changes
  if (data && webhookUrl === '' && data.apiWebhookUrl) {
    setWebhookUrl(data.apiWebhookUrl);
  }

  const handleGenerateKey = async () => {
    if (!isAdmin) return;
    if (!confirm('Generating a new API Key will invalidate any existing key. Are you sure?')) return;
    
    setIsGeneratingKey(true);
    try {
      const res = await fetch('/api/orgs/api-settings', { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        setNewKey(result.apiKey);
        mutate();
      } else {
        alert(result.error || 'Failed to generate API Key');
      }
    } catch {
      alert('Network error.');
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleSaveWebhook = async () => {
    if (!isAdmin) return;
    setIsSavingWebhook(true);
    try {
      const res = await fetch('/api/orgs/api-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiWebhookUrl: webhookUrl }),
      });
      const result = await res.json();
      if (result.success) {
        alert('Webhook URL saved successfully!');
        mutate();
      } else {
        alert(result.error || 'Failed to save Webhook URL');
      }
    } catch {
      alert('Network error.');
    } finally {
      setIsSavingWebhook(false);
    }
  };

  const copyToClipboard = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 3000);
    }
  };

  if (!data) return <div className="p-5 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-sm overflow-hidden mt-6">
      <div className="px-5 py-3.5 border-b border-border bg-indigo-500/5">
        <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Custom API Settings</h3>
      </div>
      <div className="p-5 space-y-6">
        
        {/* API KEY SECTION */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Key className="w-3.5 h-3.5" /> API Key
          </label>
          
          {newKey ? (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-4">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                New API Key Generated
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-3">
                Please copy this key now. You will not be able to see it again!
              </p>
              <div className="flex gap-2">
                <code className="flex-1 bg-white dark:bg-black/40 border border-emerald-200 dark:border-emerald-500/30 rounded-lg px-3 py-2 text-xs font-mono text-emerald-700 dark:text-emerald-300 overflow-x-auto break-all">
                  {newKey}
                </code>
                <button 
                  onClick={copyToClipboard}
                  className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors flex items-center gap-1 shrink-0"
                >
                  {copiedKey ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex-1">
                {data.hasApiKey ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">Status: <span className="text-emerald-500 font-bold">Active</span></span>
                    <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded inline-block max-w-max border border-border">
                      {data.maskedApiKey}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground font-medium">No API Key generated yet.</span>
                )}
              </div>
              
              {isAdmin && (
                <button
                  onClick={handleGenerateKey}
                  disabled={isGeneratingKey}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50 shrink-0 shadow-sm"
                >
                  {isGeneratingKey ? 'Generating...' : (data.hasApiKey ? 'Regenerate Key' : 'Generate Key')}
                </button>
              )}
            </div>
          )}
        </div>

        <hr className="border-border" />

        {/* WEBHOOK SECTION */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" /> Outbound Webhook URL
          </label>
          <p className="text-xs text-muted-foreground">
            We will send HTTP POST requests to this URL whenever an AI or Agent replies to a custom API user.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              disabled={!isAdmin}
              placeholder="https://your-server.com/api/webhook"
              className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-indigo-500/50 transition-colors disabled:opacity-50"
            />
            {isAdmin && (
              <button
                onClick={handleSaveWebhook}
                disabled={isSavingWebhook}
                className="px-4 py-2.5 rounded-xl bg-surface border border-border hover:bg-muted text-foreground text-xs font-bold transition-all disabled:opacity-50 shrink-0 shadow-sm"
              >
                {isSavingWebhook ? 'Saving...' : 'Save Webhook'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
