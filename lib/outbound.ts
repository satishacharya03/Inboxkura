import { Platform, PlatformConfig } from '@prisma/client';
import { sendTelegramMessage } from '@/lib/telegram';

type SendArgs = {
  platform: Platform;
  recipientId: string;
  text: string;
  config?: Pick<PlatformConfig, 'accessToken' | 'pageId'> | null;
  connectionId?: string | null;
  apiWebhookUrl?: string | null;
};

type GraphErrorPayload = {
  error?: {
    message?: string;
    code?: number;
    type?: string;
  };
};

const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v19.0';

export class OutboundMessageError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'OutboundMessageError';
    this.status = status;
  }
}

async function readGraphError(response: Response) {
  try {
    const body = await response.json() as GraphErrorPayload;
    return body.error?.message || response.statusText;
  } catch {
    return response.statusText;
  }
}

async function postJson(url: string, payload: unknown, accessToken?: string) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new OutboundMessageError(await readGraphError(response), response.status);
  }

  return response.json();
}

export async function sendOutboundMessage({
  platform,
  recipientId,
  text,
  config,
  connectionId,
  apiWebhookUrl,
}: SendArgs) {
  if (platform === Platform.TELEGRAM) {
    const businessConnectionId = connectionId || config?.pageId;
    // Standard Bot mode fallback: if connection ID is 'standard_bot', empty, or contains 'bot'
    const isStandardBot = !businessConnectionId || 
                          businessConnectionId === 'standard_bot' || 
                          businessConnectionId.toLowerCase().includes('bot') ||
                          businessConnectionId.toLowerCase().startsWith('demo');
                          
    return sendTelegramMessage(
      recipientId,
      text,
      isStandardBot ? undefined : businessConnectionId
    );
  }

  if (platform === Platform.TIKTOK) {
    if (!config?.pageId) {
      throw new OutboundMessageError('No TikTok page ID / target ID is configured. Add it in settings.');
    }
    // Sandbox or manual testing mock token fallback
    if (!config?.accessToken || config.accessToken === 'manual_setup' || config.accessToken.startsWith('mock_')) {
      console.log(`[TikTok Send Mock] Mocking send to ${recipientId}: "${text}"`);
      return { message_id: `mock_tt_${Date.now()}` };
    }

    return postJson(
      'https://open.tiktokapis.com/v2/business/message/send/',
      {
        recipient_id: recipientId,
        message: {
          message_type: 'TEXT',
          content: JSON.stringify({ text }),
        },
      },
      config.accessToken
    );
  }

  if (!config?.accessToken) {
    throw new OutboundMessageError(`No access token is configured for ${platform}. Reconnect this channel in settings.`);
  }

  if (platform === Platform.FB) {
    return postJson(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text },
        messaging_type: 'RESPONSE',
      },
      config.accessToken
    );
  }

  if (platform === Platform.IG) {
    if (!config.pageId) {
      throw new OutboundMessageError('No Instagram user ID is configured. Reconnect Instagram in settings.');
    }
    return postJson(
      `https://graph.instagram.com/${META_GRAPH_VERSION}/${config.pageId}/messages`,
      {
        recipient: { id: recipientId },
        message: { text },
      },
      config.accessToken
    );
  }

  if (platform === Platform.WA) {
    if (!config.pageId) {
      throw new OutboundMessageError('No WhatsApp phone number ID is configured. Add it in WhatsApp settings.');
    }
    return postJson(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${config.pageId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: recipientId,
        type: 'text',
        text: {
          preview_url: false,
          body: text,
        },
      },
      config.accessToken
    );
  }

  if (platform === Platform.CUSTOM) {
    if (!apiWebhookUrl) {
      console.log(`[CUSTOM Webhook] No webhook URL configured. Returning mock message_id.`);
      return { message_id: `custom_msg_${Date.now()}` };
    }
    return postJson(
      apiWebhookUrl,
      {
        recipient_id: recipientId,
        text: text,
        timestamp: new Date().toISOString(),
      }
    );
  }

  throw new OutboundMessageError(`Outbound messaging is not configured for platform ${platform}`, 501);
}
