import { verifyMetaWebhook, verifyMetaSignature } from '../shared';
import { webhookQueue } from '@/lib/queue';
import { rateLimitSlidingWindow } from '@/lib/rate-limiter';

export async function GET(request: Request) {
  return verifyMetaWebhook(request);
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const bodyText = await request.text();
  const secret = process.env.FACEBOOK_APP_SECRET;

  // 1. Verify Meta Signature to protect against spoofing
  if (secret && !verifyMetaSignature(request, bodyText, secret)) {
    console.error('✗ Forbidden Signature on WA Webhook');
    return new Response('Forbidden Signature', { status: 403 });
  }

  // 2. Apply Redis Sliding Window Rate Limiting (100 webhooks per minute per IP)
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  try {
    const rateLimit = await rateLimitSlidingWindow({
      key: `ip:${ip}:webhook:wa`,
      limit: 100,
      windowMs: 60000,
    });

    if (!rateLimit.success) {
      console.warn(`⚠️ Webhook rate limit exceeded for IP ${ip}`);
      return new Response('Too Many Requests', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetMs.toString(),
        },
      });
    }
  } catch (err) {
    console.error('✗ Rate limiter failure (fail-open to preserve incoming messages):', err);
  }

  // 3. Parse body safely
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch (err) {
    return new Response('Invalid JSON', { status: 400 });
  }

  // 4. Enqueue raw payload to BullMQ for background worker execution
  try {
    await webhookQueue.add(
      'whatsapp_payload',
      {
        platform: 'WA',
        payload: body,
        receivedAt: Date.now(),
      }
    );
  } catch (err) {
    console.error('✗ Failed to enqueue WhatsApp webhook payload:', err);
    return new Response('Internal Server Error', { status: 500 });
  }

  console.log(`⚡ Inbound WA Webhook enqueued in ${Date.now() - startTime}ms`);
  
  // 5. Respond with 200 OK immediately
  return new Response('EVENT_RECEIVED', { status: 200 });
}
