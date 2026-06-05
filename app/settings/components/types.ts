export type Platform = {
  id: string;
  name: string;
  color: string;
  bgGrad: string;
  icon: React.ReactNode;
  connected: boolean;
  docsUrl: string;
  description: string;
  statusLabel?: string;
  disabled?: boolean;
};

export type PlatformConfigStatus = {
  platform: string;
  pageId: string | null;
  connectedName?: string | null;
  connectedEmail?: string | null;
  connectedAvatar?: string | null;
};

export type PlatformStatusResponse = Partial<Record<string, boolean>> & {
  configs?: PlatformConfigStatus[];
  orgId?: string;
  role?: string;
  error?: string;
};

export type OrgMember = {
  memberId: string;
  userId: string;
  email: string;
  name: string | null;
  role: string;
  joinedAt: string;
};

export type OrgInvite = {
  id: string;
  email: string;
  role: string;
  inviteUrl: string;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
};
