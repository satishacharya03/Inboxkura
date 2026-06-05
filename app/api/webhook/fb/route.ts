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

  if (secret && !verifyMetaSignature(request, bodyText, secret)) {
    console.error('✗ Forbidden Signature on FB Webhook');
    return new Response('Forbidden', { status: 403 });
  }

  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  try {
    const rateLimit = await rateLimitSlidingWindow({
      key: `ip:${ip}:webhook:fb`,
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
    await webhookQueue.add('facebook_payload', {
      platform: 'FB',
      payload: body,
      receivedAt: Date.now(),
    });
  } catch (err) {
    console.error('✗ Failed to enqueue Facebook webhook payload:', err);
    return new Response('Internal Server Error', { status: 500 });
  }

  console.log(`⚡ Inbound FB Webhook enqueued in ${Date.now() - startTime}ms`);
  return new Response('EVENT_RECEIVED', { status: 200 });
}
