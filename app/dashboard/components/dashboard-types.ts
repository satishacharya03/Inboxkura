export type Sentiment = 'positive' | 'neutral' | 'negative' | 'frustrated';
export type Platform = 'FB' | 'IG' | 'WA' | 'TELEGRAM' | 'TIKTOK';

export type OrgInfo = { orgId: string; name: string; role: string };
export type OrgData = { activeOrgId: string | null; orgs: OrgInfo[] };

export type Message = {
  id: string;
  platform: Platform;
  text: string;
  timestamp: string;
  isOutbound: boolean;
  isAiReply: boolean;
  aiCategory: string | null;
  isRead: boolean;
  contactId: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
  repliedBy?: { id: string; name: string | null; email: string } | null;
  platformMessageId?: string | null;
  reaction?: string | null;
};

export type Contact = {
  id: string;
  orgId: string;
  platform: Platform;
  platformId: string;
  name: string | null;
  avatarUrl: string | null;
  aiPersona?: string | null;
  autoRespond?: boolean;
  conversationContext?: string | null;
  lastContextUpdatedAt?: string | null;
  businessNotes?: string | null;
  internalNotes?: string | null;
  createdAt: string;
  messages: Message[];
  tickets?: {
    id: string;
    subject: string;
    description: string | null;
    status: string;
    priority: string;
    createdAt: string;
  }[];
};
