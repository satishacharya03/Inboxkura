import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Shared Redis connection for BullMQ
export const queueConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

// Primary inbound queue for receiving webhook payloads
export const webhookQueue = new Queue('webhook-inbound', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000, // Wait 2s, then 4s, 8s, 16s...
    },
    removeOnComplete: true, // Auto clean up successful jobs
    removeOnFail: 1000,     // Retain last 1000 failed jobs for debugging
  },
});
