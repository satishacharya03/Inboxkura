import { webhookQueue } from '@/lib/queue';
import { rateLimitSlidingWindow } from '@/lib/rate-limiter';

export async function POST(request: Request) {
  const startTime = Date.now();
  
  // Verify secret token
  const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (secretToken !== process.env.TELEGRAM_SECRET_TOKEN) {
    console.warn('✗ Telegram webhook: invalid secret token');
    return new Response('OK', { status: 200 }); // Always 200 to prevent retries
  }

  const bodyText = await request.text();
  
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  try {
    const rateLimit = await rateLimitSlidingWindow({
      key: `ip:${ip}:webhook:tg`,
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
    await webhookQueue.add('telegram_payload', {
      platform: 'TELEGRAM',
      payload: body,
      receivedAt: Date.now(),
    });
  } catch (err) {
    console.error('✗ Failed to enqueue Telegram webhook payload:', err);
    return new Response('Internal Server Error', { status: 500 });
  }

  console.log(`⚡ Inbound TG Webhook enqueued in ${Date.now() - startTime}ms`);
  return new Response('OK', { status: 200 });
}
