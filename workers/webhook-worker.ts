import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../lib/prisma';
import { saveMessageToOrg } from '../app/api/webhook/shared';

// Load environmental configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

console.log('🏁 Starting BullMQ Webhook Worker...');

const worker = new Worker(
  'webhook-inbound',
  async (job) => {
    const { platform, payload } = job.data;
    console.log(`📦 Processing enqueued job ${job.id} for platform ${platform}`);

    try {
      if (platform === 'WA') {
        const body = payload;
        if (body.object === 'whatsapp_business_account') {
          const entries = (Array.isArray(body.entry) ? body.entry : []) as any[];
          for (const entry of entries) {
            const changes = (Array.isArray(entry.changes) ? entry.changes : []) as any[];
            const value    = changes[0]?.value;
            const metadata = value?.metadata;
            const messages = (Array.isArray(value?.messages) ? value.messages : []) as any[];
            const pageId = typeof metadata?.phone_number_id === 'string' ? metadata.phone_number_id : undefined;
            
            if (messages.length > 0) {
              const msg     = messages[0];
              const textObj = msg.text;
              const senderId  = typeof msg.from === 'string' ? msg.from : undefined;
              const timestamp = typeof msg.timestamp === 'string' ? parseInt(msg.timestamp, 10) * 1000 : Date.now();

              let text = typeof textObj?.body === 'string' ? textObj.body : undefined;
              let waMediaId: string | undefined = undefined;

              if (msg.type === 'image' && msg.image) {
                const imageObj = msg.image;
                waMediaId = typeof imageObj.id === 'string' ? imageObj.id : undefined;
                text = typeof imageObj.caption === 'string' ? imageObj.caption : 'Sent a photo';
              } else if ((msg.type === 'audio' || msg.type === 'voice') && msg.audio) {
                const audioObj = msg.audio;
                waMediaId = typeof audioObj.id === 'string' ? audioObj.id : undefined;
                text = 'Sent a voice message';
              } else if (msg.type === 'video' && msg.video) {
                const videoObj = msg.video;
                waMediaId = typeof videoObj.id === 'string' ? videoObj.id : undefined;
                text = typeof videoObj.caption === 'string' ? videoObj.caption : 'Sent a video';
              }

              let senderName: string | undefined = undefined;
              const contacts = (Array.isArray(value?.contacts) ? value.contacts : []) as any[];
              if (senderId) {
                const contactObj = contacts.find(c => String(c.wa_id) === senderId) || contacts[0];
                const profileObj = contactObj?.profile;
                if (typeof profileObj?.name === 'string') {
                  senderName = profileObj.name;
                }
              }

              const platformMessageId = typeof msg.id === 'string' ? msg.id : undefined;
              const hasContent = text !== undefined || waMediaId !== undefined;

              if (senderId && hasContent && pageId) {
                // Save and run auto-reply pipeline (which is awaited in saveMessageToOrg)
                await saveMessageToOrg(
                  'WA',
                  senderId,
                  text || 'Sent a message',
                  timestamp,
                  pageId,
                  undefined,
                  false,
                  platformMessageId,
                  senderName,
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  waMediaId
                );
              }
            }
          }
        }
      }
      // Expandable for other inbound webhook platforms (FB, IG, TG, TT)
    } catch (err) {
      console.error(`✗ Error processing job ${job.id}:`, err);
      throw err; // Propagate error so BullMQ schedules exponential backoff retries
    }
  },
  {
    connection,
    concurrency: process.env.WORKER_CONCURRENCY ? parseInt(process.env.WORKER_CONCURRENCY, 10) : 10,
  }
);

worker.on('completed', (job) => {
  console.log(`✓ Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`✗ Job ${job?.id} failed with error:`, err);
});
