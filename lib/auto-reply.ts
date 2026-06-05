import { prisma } from './prisma';
import { analyzeMessageWithGemini } from './gemini';
import { sendOutboundMessage } from './outbound';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Generates an updated rolling conversation context summary using Gemini.
 * Combines previous context + new messages into a fresh 3-5 sentence memory.
 */
export async function updateConversationContext(
  contactId: string,
  previousContext: string | null,
  newMessages: { isOutbound: boolean; text: string }[]
): Promise<void> {
  try {
    const newMsgText = newMessages
      .map(m => `${m.isOutbound ? 'Agent' : 'Customer'}: ${m.text}`)
      .join('\n');

    const prompt = previousContext
      ? `You are maintaining a concise conversation memory for a business customer support system.

Previous memory summary:
${previousContext}

New messages just exchanged:
${newMsgText}

Update the memory summary to include the new information. Write a clear, factual summary in 3-5 sentences covering:
1. What the customer has asked or discussed
2. What the agent has already responded/offered
3. Any pending issues, follow-ups, or key customer details

Keep it concise and in third-person. Do NOT include greetings or filler. Write only the summary.`
      : `You are creating a conversation memory for a business customer support system.

Here are the first messages in the conversation:
${newMsgText}

Write a clear, factual summary in 2-4 sentences covering what the customer has discussed and what the agent has responded. Keep it concise and in third-person. Write only the summary.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
    });

    const updatedContext = response.text?.trim();
    if (updatedContext) {
      await prisma.contact.update({
        where: { id: contactId },
        data: {
          conversationContext: updatedContext,
          lastContextUpdatedAt: new Date(),
        },
      });
      console.log(`[Context] Updated conversation context for contact ${contactId}`);
    }
  } catch (err) {
    console.error(`[Context] Failed to update conversation context for ${contactId}:`, err);
  }
}

/**
 * Extracts business insights from the conversation and stores them.
 */
export async function extractBusinessNotes(
  contactId: string,
  contextStr: string,
  sentiment: string,
  category: string,
  analysis: string,
  geminiResult: Record<string, unknown> | null
): Promise<void> {
  try {
    const existing = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { name: true, businessNotes: true },
    });

    const existingNotes = existing?.businessNotes ? JSON.parse(existing.businessNotes) : {};

    // Build qualification score from sentiment history
    const sentimentScores: Record<string, number> = {
      positive: 80,
      neutral: 50,
      negative: 30,
      frustrated: 10,
    };
    const newScore = sentimentScores[sentiment] ?? 50;
    const prevScore = existingNotes.qualificationScore ?? 50;
    // Rolling average — weight new score at 30%
    const qualificationScore = Math.round(prevScore * 0.7 + newScore * 0.3);

    // Determine qualification label
    let qualificationLabel = 'Cold';
    if (qualificationScore >= 70) qualificationLabel = 'Hot';
    else if (qualificationScore >= 45) qualificationLabel = 'Warm';

    // Build extracted contact info
    const extractedContactInfo = {
      name: geminiResult?.extractedName || existingNotes.extractedContactInfo?.name || '',
      email: geminiResult?.extractedEmail || existingNotes.extractedContactInfo?.email || '',
      phone: geminiResult?.extractedPhone || existingNotes.extractedContactInfo?.phone || '',
      address: geminiResult?.extractedAddress || existingNotes.extractedContactInfo?.address || '',
    };

    const updatedNotes = {
      ...existingNotes,
      qualificationScore,
      qualificationLabel,
      lastSentiment: sentiment,
      lastCategory: category,
      lastIntent: analysis,
      extractedContactInfo,
      lastUpdated: new Date().toISOString(),
    };

    const updateData: Record<string, unknown> = {
      businessNotes: JSON.stringify(updatedNotes)
    };
    
    // Auto-update contact name if set by AI extraction and currently unset
    if (geminiResult?.extractedName && (!existing?.name || existing.name === 'Unknown')) {
      updateData.name = geminiResult.extractedName;
    }

    await prisma.contact.update({
      where: { id: contactId },
      data: updateData,
    });
  } catch (err) {
    console.error(`[BusinessNotes] Failed to extract notes for ${contactId}:`, err);
  }
}

export async function triggerAutoReply(messageId: string) {
  try {
    // 1. Fetch message and verify it's an inbound message and its contact exists
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        contact: true,
        org: true,
      },
    });

    if (!message || message.isOutbound || !message.contact || message.aiCategory) {
      return;
    }

    const { contact, orgId } = message;

    console.log(`[Auto-Respond/Analysis] Triggered for message ${messageId} (Contact: ${contact.name || contact.platformId})`);

    // 3. Fetch the last 6 messages of this contact to serve as context for the analysis
    const recentMessages = await prisma.message.findMany({
      where: { contactId: contact.id },
      orderBy: { timestamp: 'desc' },
      take: 6,
    });

    // Find the most recent media in the last 6 messages if the current message doesn't have one
    let activeImageUrl = message.imageUrl || undefined;
    let activeAudioUrl = message.audioUrl || undefined;

    if (!activeImageUrl && !activeAudioUrl) {
      const recentMedia = recentMessages.find(m => m.imageUrl || m.audioUrl);
      if (recentMedia) {
        activeImageUrl = recentMedia.imageUrl || undefined;
        activeAudioUrl = recentMedia.audioUrl || undefined;
        console.log(`[Auto-Respond/Analysis] Found recent media in message ${recentMedia.id} to pass as context to Gemini.`);
      }
    }

    // Format context oldest to newest
    const contextStr = recentMessages
      .reverse()
      .map(m => `${m.isOutbound ? 'Agent' : 'Customer'}: ${m.text}`)
      .join('\n');

    // 4. Fetch platform config and set up identity details
    const platformConfig = await prisma.platformConfig.findUnique({
      where: { orgId_platform: { orgId, platform: contact.platform } },
    });

    const connectedName = platformConfig?.connectedName || undefined;
    const orgName = message.org?.name || undefined;

    // 5. Fetch organization knowledge base and settings
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        knowledgeBase: true,
        aiLanguage: true,
        audioTranscriptions: true,
        imageUnderstanding: true,
        handoffTriggers: true,
        autoCreateTicket: true,
      },
    });
    const knowledgeBase = org?.knowledgeBase as Record<string, unknown> | null || null;

    // 6. Load the fallback persona if contact persona is not configured
    let effectivePersona = contact.aiPersona || undefined;
    if (!effectivePersona) {
      let member = await prisma.orgMember.findFirst({
        where: { orgId, role: 'OWNER' },
        include: { user: true }
      });
      if (!member) {
        member = await prisma.orgMember.findFirst({
          where: { orgId, role: 'ADMIN' },
          include: { user: true }
        });
      }
      if (member?.user?.aiPersona) {
        effectivePersona = member.user.aiPersona;
      }
    }

    // 7. Get stored conversation context for memory
    const conversationContext = contact.conversationContext || null;

    // 8. Generate the analysis and suggestions using Gemini
    const analysis = await analyzeMessageWithGemini(
      message.text,
      contextStr,
      false, // moreOptions
      effectivePersona,
      activeImageUrl,
      activeAudioUrl,
      orgId,
      message.platform,
      connectedName,
      orgName,
      knowledgeBase,
      conversationContext
    );

    if (!analysis || !analysis.suggestedReplies || analysis.suggestedReplies.length === 0) {
      console.warn(`[Auto-Respond/Analysis] Gemini analysis returned no suggested replies for message ${messageId}`);
      return;
    }

    // Update the message in database to store AI suggestions
    await prisma.message.update({
      where: { id: message.id },
      data: {
        aiCategory: analysis.category,
      },
    });
    console.log(`[Auto-Respond/Analysis] Saved analysis fields to message ${message.id}`);

    // Update conversation context & business notes for the contact (updates AI summary and AI score)
    const messagesForContext = [
      ...recentMessages.map(m => ({ isOutbound: m.isOutbound, text: m.text })),
    ];
    await updateConversationContext(contact.id, conversationContext, messagesForContext);
    await extractBusinessNotes(
      contact.id,
      contextStr,
      analysis.sentiment,
      analysis.category,
      analysis.analysis,
      analysis
    );

    // 2. Check if autoRespond is enabled for this contact
    if (!contact.autoRespond) {
      console.log(`[Auto-Respond] Auto-reply is OFF for contact ${contact.id}. Skipped outbound dispatch.`);
      return;
    }

    // Simulate natural human typing speed with a 10-second delay for auto response dispatch
    console.log(`[Auto-Respond] Waiting 10 seconds to simulate human response time...`);
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 9. Select the best reply using bestReplyIndex (safely bounds-check)
    let bestIndex = analysis.bestReplyIndex;
    if (bestIndex === undefined || bestIndex < 0 || bestIndex >= analysis.suggestedReplies.length) {
      bestIndex = 0;
    }
    const chosenReply = analysis.suggestedReplies[bestIndex];

    console.log(`[Auto-Respond] Selected reply index ${bestIndex}: "${chosenReply}"`);

    // 9.5 Check handoff triggers and automated ticket creation requirements
    const textLower = (message.text || '').toLowerCase();
    const triggers = org?.handoffTriggers || [];
    const finalTriggers = triggers.length > 0 ? triggers : [
      "talk to a human", "real person please", "I want to speak to someone",
      "disappointing", "bad service", "worst service", "I want to return",
      "I need a refund", "not satisfied", "I need a manager", "file a complaint",
      "manche sanga kura garna", "manxe chainxa", "ramro chaina"
    ];
    const matchedTrigger = finalTriggers.some(t => textLower.includes(t.toLowerCase()));
    const shouldEscalate = matchedTrigger || analysis.ticketRequested;

    if (shouldEscalate) {
      console.log(`[Handoff] Escalation triggered for contact ${contact.id}. Disabling auto-reply.`);
      await prisma.contact.update({
        where: { id: contact.id },
        data: { autoRespond: false },
      });

      if (org?.autoCreateTicket !== false) {
        const ticketSubject = analysis.ticketSubject || (matchedTrigger ? `Escalated trigger: "${message.text.substring(0, 30)}..."` : 'Support Request');
        const ticketDesc = analysis.ticketDescription || `Customer escalation message: "${message.text}"`;
        const ticketPriority = analysis.ticketPriority || 'Medium';

        await prisma.ticket.create({
          data: {
            orgId: orgId,
            contactId: contact.id,
            subject: ticketSubject,
            description: ticketDesc,
            priority: ticketPriority,
            status: 'Open',
          }
        });
        console.log(`[Handoff] Automatically created Ticket record.`);
      }
    }

    // For Telegram, connectionId might be needed (stored in pageId or connectionId)
    const effectiveConnectionId = platformConfig?.connectionId || platformConfig?.pageId;

    // 10. Dispatch the outbound message using sendOutboundMessage
    const result = await sendOutboundMessage({
      platform: contact.platform,
      recipientId: contact.platformId,
      text: chosenReply,
      config: platformConfig,
      connectionId: effectiveConnectionId,
    });

    const platformMessageId = result?.message_id || result?.messages?.[0]?.id || null;

    // 11. Save the sent message to database as an outbound message
    const savedOutbound = await prisma.message.create({
      data: {
        platform: contact.platform,
        text: chosenReply,
        orgId: orgId,
        contactId: contact.id,
        isOutbound: true,
        isRead: true,
        isAiReply: true,
        platformMessageId,
        aiCategory: analysis.category,
      },
    });

    console.log(`[Auto-Respond] Successfully sent and saved auto-reply: "${savedOutbound.text}" (ID: ${savedOutbound.id})`);

    // 12. Update conversation context in background to include the auto-reply
    const updatedMessagesForContext = [
      ...messagesForContext,
      { isOutbound: true, text: chosenReply },
    ];
    updateConversationContext(contact.id, contact.conversationContext, updatedMessagesForContext).catch(console.error);

  } catch (error) {
    console.error(`[Auto-Respond] Error executing auto-reply/analysis for message ${messageId}:`, error);
  }
}
