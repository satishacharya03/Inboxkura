import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Prevent multiple Redis clients in development hot-reloads
const globalForRedis = global as unknown as { redisPub: Redis };

export const redisPub =
  globalForRedis.redisPub ||
  new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redisPub = redisPub;
}

interface SocketEvent {
  orgId: string;
  event: 'message:new' | 'message:updated' | 'contact:updated' | 'ticket:new' | 'ticket:updated';
  payload: any;
}

/**
 * Publishes a real-time event to the Redis 'app:events' channel.
 * The standalone WebSockets server will listen to this channel and broadcast to the user's organization room.
 */
export async function publishSocketEvent({ orgId, event, payload }: SocketEvent) {
  try {
    const message = JSON.stringify({ orgId, event, payload });
    await redisPub.publish('app:events', message);
  } catch (error) {
    console.error('Failed to publish socket event to Redis:', error);
  }
}
