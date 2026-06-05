import React from 'react';
import { MessageCircle, Tag, User } from 'lucide-react';
import { TikTokIcon } from '@/app/dashboard/components/dashboard-ui';

export interface UnifiedMessage {
  id: string;
  platform: 'TIKTOK' | 'FB' | 'IG' | 'WA'; // Matches DB Platform enum
  senderId: string;
  content: string;
  timestamp: string | Date;
  aiSentiment?: string;
  aiCategory?: string;
}

const sentimentColors: Record<string, string> = {
  positive: 'bg-green-500/10 text-green-700 border-green-500/20',
  neutral: 'bg-gray-500/10 text-gray-700 border-gray-500/20',
  negative: 'bg-red-500/10 text-red-700 border-red-500/20',
  frustrated: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
};

const PlatformIcon = ({ platform }: { platform: UnifiedMessage['platform'] }) => {
  if (platform === 'TIKTOK') {
    return (
      <div className="flex items-center gap-1 text-xs font-semibold text-black dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-[4px]">
        <TikTokIcon width={12} height={12} className="text-black dark:text-white" /> TikTok
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-[4px]">
      <MessageCircle className="w-3 h-3" /> Meta ({platform})
    </div>
  );
};

export const UnifiedMessageCard = ({ message }: { message: UnifiedMessage }) => {
  const fDate = new Date(message.timestamp).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });

  return (
    <div className="flex flex-col gap-2 p-3 text-sm border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-neutral-900 shadow-sm transition hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={message.platform} />
          <span className="flex items-center gap-1 text-gray-500 text-xs">
            <User className="w-3 h-3" /> {message.senderId}
          </span>
          <span className="text-gray-400 text-xs flex items-center">&bull; {fDate}</span>
        </div>
      </div>
      
      {/* Body */}
      <p className="text-gray-800 dark:text-gray-200 leading-snug break-words">
        {message.content}
      </p>

      {/* Footer / AI Tags */}
      {(message.aiSentiment || message.aiCategory) && (
        <div className="flex items-center gap-2 mt-1 -ml-1">
          {message.aiSentiment && (
            <span className={`text-[10px] px-2 py-[2px] rounded-full border uppercase tracking-wider font-semibold ${sentimentColors[message.aiSentiment.toLowerCase()] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
              {message.aiSentiment}
            </span>
          )}
          {message.aiCategory && (
            <span className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-[2px] rounded-full uppercase tracking-wider font-semibold">
              <Tag className="w-3 h-3" /> {message.aiCategory}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
