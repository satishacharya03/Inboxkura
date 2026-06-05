import { createHmac } from 'crypto';
import { webhookQueue } from '@/lib/queue';
import { rateLimitSlidingWindow } from '@/lib/rate-limiter';

export async function POST(request: Request) {
  const startTime = Date.now();
  const bodyText = await request.text();
  const tiktokSignature = request.headers.get('tiktok-signature');

  if (tiktokSignature) {
    const parts = tiktokSignature.split(',');
    const tPart = parts.find(p => p.startsWith('t='));
    const sPart = parts.find(p => p.startsWith('s='));
    if (tPart && sPart) {
      const timestamp = tPart.split('=')[1];
      const signature = sPart.split('=')[1];
      const secret = process.env.TIKTOK_CLIENT_SECRET;
      if (secret) {
        const expected = createHmac('sha256', secret).update(`${timestamp}.${bodyText}`).digest('hex');
        if (signature !== expected) {
          console.error('✗ Forbidden Signature on TT Webhook');
          return new Response('Forbidden', { status: 403 });
        }
      }
    } else {
      return new Response('Forbidden', { status: 403 });
    }
  } else {
    return new Response('Forbidden', { status: 403 });
  }

  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  try {
    const rateLimit = await rateLimitSlidingWindow({
      key: `ip:${ip}:webhook:tt`,
      limit: 100,
      windowMs: 60000,
    });

    if (!rateLimit.success) {
      console.warn(`⚠️ Webhook rate limit exceeded for IP ${ip}`);
      return new Response('Too Many Requests', { status: 429 });
    }
  } catch (err) {
    console.error('✗ Rate limiter failure:', err);
  }

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch (err) {
    return new Response('OK', { status: 200 });
  }

  try {
    await webhookQueue.add('tiktok_payload', {
      platform: 'TIKTOK',
      payload: body,
      receivedAt: Date.now(),
    });
  } catch (err) {
    console.error('✗ Failed to enqueue TikTok webhook payload:', err);
    return new Response('Internal Server Error', { status: 500 });
  }

  console.log(`⚡ Inbound TT Webhook enqueued in ${Date.now() - startTime}ms`);
  return new Response('EVENT_RECEIVED', { status: 200 });
}
