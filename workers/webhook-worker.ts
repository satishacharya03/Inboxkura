import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../lib/prisma';
import { saveMessageToOrg } from '../app/api/webhook/shared';
import { triggerAutoReply } from '../lib/auto-reply';

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
      } else if (platform === 'FB') {
        const body = payload;
        if (body.object === 'page') {
          const entries = (Array.isArray(body.entry) ? body.entry : []) as any[];
          for (const entry of entries) {
            const messaging = (Array.isArray(entry.messaging) ? entry.messaging : []) as any[];
            const event = messaging[0];
            if (!event) continue;
            
            const sender  = event?.sender;
            const recipient = event?.recipient;
            const message = event?.message;
            const pageId   = entry.id ? String(entry.id) : undefined;
            const isEcho   = !!message?.is_echo;
            
            const customerId = isEcho 
              ? (recipient?.id ? String(recipient.id) : undefined)
              : (sender?.id ? String(sender.id) : undefined);
              
            const text     = typeof message?.text === 'string' ? message.text : undefined;
            const timestamp = typeof event?.timestamp === 'number' ? event.timestamp : Date.now();
            const platformMessageId = message?.mid ? String(message.mid) : undefined;

            let imageUrl: string | undefined = undefined;
            let audioUrl: string | undefined = undefined;
            let videoUrl: string | undefined = undefined;

            const attachments = message?.attachments;
            if (Array.isArray(attachments) && attachments.length > 0) {
              for (const attachment of attachments) {
                const attachmentPayload = attachment.payload;
                if (typeof attachmentPayload?.url === 'string') {
                  const type = String(attachment.type).toLowerCase();
                  if (type === 'image') {
                    imageUrl = attachmentPayload.url;
                  } else if (type === 'audio') {
                    audioUrl = attachmentPayload.url;
                  } else if (type === 'video' || type === 'ig_reel') {
                    videoUrl = attachmentPayload.url;
                  } else if (type === 'share' || type === 'fallback' || type === 'ig_post') {
                    const isVideo = attachmentPayload.url.includes('.mp4') || attachmentPayload.url.includes('video') || attachmentPayload.url.includes('reel');
                    if (isVideo) {
                      videoUrl = attachmentPayload.url;
                    } else {
                      imageUrl = attachmentPayload.url;
                    }
                    const shareImageUrl = attachmentPayload.thumbnail_url || attachmentPayload.image_url || attachmentPayload.share?.image || attachmentPayload.share?.thumbnail_url;
                    if (typeof shareImageUrl === 'string') {
                      imageUrl = shareImageUrl;
                    }
                  }
                }
              }
            }

            const hasContent = text !== undefined || imageUrl !== undefined || audioUrl !== undefined || videoUrl !== undefined;
            const finalMsgText = text || (imageUrl ? 'Sent a photo' : audioUrl ? 'Sent a voice message' : videoUrl ? 'Sent a video' : '');

            if (customerId && hasContent && pageId) {
              await saveMessageToOrg(
                'FB',
                customerId,
                finalMsgText,
                timestamp,
                pageId,
                undefined,
                isEcho,
                platformMessageId,
                undefined,
                undefined,
                imageUrl,
                audioUrl,
                videoUrl
              );
            }
          }
        }
      } else if (platform === 'IG') {
        const body = payload;
        const isIgPayload = body.object === 'instagram' || body.object === 'page';

        if (isIgPayload) {
          const entries = (Array.isArray(body.entry) ? body.entry : []) as any[];
          for (const entry of entries) {
            const messagingEvents = (Array.isArray(entry.messaging) ? entry.messaging : []) as any[];
            for (const event of messagingEvents) {
              const sender    = event?.sender;
              const recipient = event?.recipient;
              const message   = event?.message;
              const pageId    = entry.id ? String(entry.id) : undefined;
              const isEcho = !!(message?.is_echo || message?.is_self);

              const customerId = isEcho
                ? (recipient?.id ? String(recipient.id) : undefined)
                : (sender?.id ? String(sender.id) : undefined);

              const text      = typeof message?.text === 'string' ? message.text : undefined;
              const timestamp = typeof event?.timestamp === 'number' ? event.timestamp : Date.now();
              const platformMessageId = message?.mid ? String(message.mid) : undefined;

              let imageUrl: string | undefined = undefined;
              let audioUrl: string | undefined = undefined;
              let videoUrl: string | undefined = undefined;

              const attachments = message?.attachments;
              if (Array.isArray(attachments) && attachments.length > 0) {
                for (const attachment of attachments) {
                  const attachmentPayload = attachment.payload;
                  if (typeof attachmentPayload?.url === 'string') {
                    const type = String(attachment.type).toLowerCase();
                    if (type === 'image') {
                      imageUrl = attachmentPayload.url;
                    } else if (type === 'audio') {
                      audioUrl = attachmentPayload.url;
                    } else if (type === 'video' || type === 'ig_reel') {
                      videoUrl = attachmentPayload.url;
                    } else if (type === 'share' || type === 'fallback' || type === 'ig_post') {
                      const isVideo = attachmentPayload.url.includes('.mp4') || attachmentPayload.url.includes('video') || attachmentPayload.url.includes('reel');
                      if (isVideo) {
                        videoUrl = attachmentPayload.url;
                      } else {
                        imageUrl = attachmentPayload.url;
                      }
                      const shareImageUrl = attachmentPayload.thumbnail_url || attachmentPayload.image_url || attachmentPayload.share?.image || attachmentPayload.share?.thumbnail_url;
                      if (typeof shareImageUrl === 'string') {
                        imageUrl = shareImageUrl;
                      }
                    }
                  }
                }
              }

              const hasContent = text !== undefined || imageUrl !== undefined || audioUrl !== undefined || videoUrl !== undefined;
              const finalMsgText = text || (imageUrl ? 'Sent a photo' : audioUrl ? 'Sent a voice message' : videoUrl ? 'Sent a Reel/video' : '');

              if (customerId && hasContent && pageId) {
                await saveMessageToOrg(
                  'IG',
                  customerId,
                  finalMsgText,
                  timestamp,
                  pageId,
                  undefined,
                  isEcho,
                  platformMessageId,
                  undefined,
                  undefined,
                  imageUrl,
                  audioUrl,
                  videoUrl
                );
              }
            }
          }
        }
      } else if (platform === 'TELEGRAM') {
        const body = payload;
        if (body.business_message) {
          const bm            = body.business_message;
          const from          = bm.from;
          const senderId      = String(from?.id ?? '');
          const content       = typeof bm.text === 'string' ? bm.text : '';
          const timestamp     = typeof bm.date === 'number' ? bm.date * 1000 : Date.now();
          const connectionId  = typeof body.business_connection_id === 'string' ? body.business_connection_id : '';

          if (senderId && content && connectionId) {
            const config = await prisma.platformConfig.findFirst({
              where: { platform: 'TELEGRAM', pageId: connectionId },
            });

            if (config?.orgId) {
              let contact = await prisma.contact.findUnique({
                where: { orgId_platform_platformId: { orgId: config.orgId, platform: 'TELEGRAM', platformId: senderId } },
              });

              const firstName = from?.first_name ? String(from.first_name) : '';
              const lastName = from?.last_name ? String(from.last_name) : '';
              const name = `${firstName} ${lastName}`.trim() || null;

              if (!contact) {
                contact = await prisma.contact.create({
                  data: { orgId: config.orgId, platform: 'TELEGRAM', platformId: senderId, name }
                });
              } else {
                const updatedName = contact.name || name;
                if (updatedName && updatedName !== contact.name) {
                  contact = await prisma.contact.update({
                    where: { id: contact.id },
                    data: { name: updatedName },
                  });
                }
              }

              const platformMessageId = bm.message_id ? String(bm.message_id) : undefined;
              if (platformMessageId) {
                const existing = await prisma.message.findFirst({
                  where: { platform: 'TELEGRAM', platformMessageId, orgId: config.orgId },
                });
                if (!existing) {
                  const savedMsg = await prisma.message.create({
                    data: {
                      platform:    'TELEGRAM',
                      text:        content,
                      timestamp:   new Date(timestamp),
                      orgId:       config.orgId,
                      contactId:   contact.id,
                      isOutbound:  false,
                      isRead:      false,
                      platformMessageId,
                    },
                  });

                  await triggerAutoReply(savedMsg.id).catch(err => {
                    console.error(`[Auto-Respond] TG business auto-reply failed:`, err);
                  });
                }
              }
            }
          }
        } else if (body.business_connection) {
          const bc           = body.business_connection;
          const connectionId = String(bc.id ?? '');
          
          if (connectionId) {
            const config = await prisma.platformConfig.findFirst({
              where: { platform: 'TELEGRAM', pageId: null },
            });

            if (config) {
              await prisma.platformConfig.update({
                where: { id: config.id },
                data: { pageId: connectionId, connectionId },
              });
            }
          }
        } else if (body.message) {
          const msg           = body.message;
          const from          = msg.from;
          const senderId      = String(from?.id ?? '');
          const content       = typeof msg.text === 'string' ? msg.text : '';
          const timestamp     = typeof msg.date === 'number' ? msg.date * 1000 : Date.now();

          if (senderId && content) {
            const config = await prisma.platformConfig.findFirst({
              where: { platform: 'TELEGRAM' },
            });

            if (config?.orgId) {
              let contact = await prisma.contact.findUnique({
                where: { orgId_platform_platformId: { orgId: config.orgId, platform: 'TELEGRAM', platformId: senderId } },
              });

              const firstName = from?.first_name ? String(from.first_name) : '';
              const lastName = from?.last_name ? String(from.last_name) : '';
              const name = `${firstName} ${lastName}`.trim() || null;

              if (!contact) {
                contact = await prisma.contact.create({
                  data: { orgId: config.orgId, platform: 'TELEGRAM', platformId: senderId, name }
                });
              } else {
                const updatedName = contact.name || name;
                if (updatedName && updatedName !== contact.name) {
                  contact = await prisma.contact.update({
                    where: { id: contact.id },
                    data: { name: updatedName },
                  });
                }
              }

              const platformMessageId = msg.message_id ? String(msg.message_id) : undefined;
              if (platformMessageId) {
                const existing = await prisma.message.findFirst({
                  where: { platform: 'TELEGRAM', platformMessageId, orgId: config.orgId },
                });
                if (!existing) {
                  const savedMsg = await prisma.message.create({
                    data: {
                      platform:    'TELEGRAM',
                      text:        content,
                      timestamp:   new Date(timestamp),
                      orgId:       config.orgId,
                      contactId:   contact.id,
                      isOutbound:  false,
                      isRead:      false,
                      platformMessageId,
                    },
                  });

                  await triggerAutoReply(savedMsg.id).catch(err => {
                    console.error(`[Auto-Respond] TG standard auto-reply failed:`, err);
                  });
                }
              }
            }
          }
        }
      } else if (platform === 'TIKTOK') {
        const body = payload;
        const events = (Array.isArray(body.events) ? body.events : Array.isArray(body.entry) ? body.entry : [body]) as any[];

        for (const event of events) {
          const sender    = event.sender;
          const from      = event.from;
          const message   = event.message;
          const recipient = event.recipient;
          const to        = event.to;

          const senderId  = String(sender?.id ?? from?.id ?? '');
          const text      = typeof message?.text === 'string' ? message.text : typeof event.text === 'string' ? event.text : '';
          const rawTs     = event.timestamp ?? Date.now();
          const timestamp = typeof rawTs === 'number' ? rawTs : Number(rawTs);
          const pageId    = String(recipient?.id ?? to?.id ?? '');

          const senderName = typeof sender?.display_name === 'string' ? sender.display_name
                           : typeof sender?.username === 'string' ? sender.username
                           : typeof sender?.name === 'string' ? sender.name
                           : typeof from?.display_name === 'string' ? from.display_name
                           : typeof from?.username === 'string' ? from.username
                           : typeof from?.name === 'string' ? from.name
                           : undefined;

          const senderAvatar = typeof sender?.avatar_url === 'string' ? sender.avatar_url
                             : typeof from?.avatar_url === 'string' ? from.avatar_url
                             : undefined;

          const platformMessageId = typeof message?.id === 'string' ? message.id
                                  : typeof message?.message_id === 'string' ? message.message_id
                                  : typeof event.message_id === 'string' ? event.message_id
                                  : undefined;

          if (senderId && text && pageId) {
            await saveMessageToOrg(
              'TIKTOK',
              senderId,
              text,
              timestamp,
              pageId,
              undefined,
              false,
              platformMessageId,
              senderName,
              senderAvatar
            );
          }
        }
      } else {
        console.warn(`⚠️ Received unknown platform ${platform} in queue`);
      }
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
