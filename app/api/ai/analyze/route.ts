import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeMessageWithGemini } from '@/lib/gemini';
import { getAuthenticatedUser, getActiveOrg } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const activeOrg = await getActiveOrg(user);
    if (!activeOrg) return NextResponse.json({ error: 'No active organization' }, { status: 400 });

    const { messageId, moreOptions, contactPersona } = await request.json();
    if (!messageId) return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });

    const message = await prisma.message.findFirst({
      where: { id: messageId, orgId: activeOrg.orgId },
      select: { id: true, text: true, imageUrl: true, audioUrl: true, contactId: true, platform: true },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Fetch the last 6 messages of this contact to serve as context for the analysis
    const recentMessages = await prisma.message.findMany({
      where: { contactId: message.contactId },
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
        console.log(`[AI Analyze] Found recent media in message ${recentMedia.id} to pass as context to Gemini.`);
      }
    }

    // Format them as a transcript string (oldest to newest)
    const contextStr = recentMessages
      .reverse()
      .map(m => `${m.isOutbound ? 'Agent' : 'Customer'}: ${m.text}`)
      .join('\n');

    // Load fallback global persona if not provided
    let effectivePersona = contactPersona;
    if (!effectivePersona) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { aiPersona: true }
      });
      effectivePersona = dbUser?.aiPersona || undefined;
    }

    // Load representative/business identity details
    const platformConfig = await prisma.platformConfig.findUnique({
      where: { orgId_platform: { orgId: activeOrg.orgId, platform: message.platform } },
      select: { connectedName: true }
    });
    const org = await prisma.organization.findUnique({
      where: { id: activeOrg.orgId },
      select: { name: true, knowledgeBase: true }
    });
    const connectedName = platformConfig?.connectedName || undefined;
    const orgName = org?.name || undefined;
    const knowledgeBase = org?.knowledgeBase as Record<string, any> | null || null;

    // Fetch contact's stored conversation context
    const contact = await prisma.contact.findUnique({
      where: { id: message.contactId },
      select: { conversationContext: true },
    });
    const conversationContext = contact?.conversationContext || null;

    const analysis = await analyzeMessageWithGemini(
      message.text,
      contextStr,
      !!moreOptions,
      effectivePersona,
      activeImageUrl,
      activeAudioUrl,
      activeOrg.orgId,
      message.platform,
      connectedName,
      orgName,
      knowledgeBase,
      conversationContext
    );

    if (!analysis) {
      return NextResponse.json({ error: 'Failed to analyze message' }, { status: 500 });
    }

    // Save sentiment, category, suggested replies on the message in DB!
    await prisma.message.update({
      where: { id: message.id },
      data: {
        aiCategory: analysis.category,
      },
    });
    console.log(`[AI Analyze Endpoint] Persisted analysis fields to message ${message.id}`);

    // Update conversation context & business notes in the background (non-blocking)
    try {
      const { updateConversationContext, extractBusinessNotes } = await import('@/lib/auto-reply');
      
      // Update rolling summary
      updateConversationContext(message.contactId, conversationContext, recentMessages).catch(console.error);

      // Update business notes (qualification score, extracted contact info)
      extractBusinessNotes(
        message.contactId,
        contextStr,
        analysis.sentiment,
        analysis.category,
        analysis.analysis,
        analysis
      ).catch(console.error);
    } catch (e) {
      console.error('Failed to import and execute metrics updates in analyze route:', e);
    }

    return NextResponse.json({
      messageId: message.id,
      sentiment: analysis.sentiment,
      category: analysis.category,
      analysis: analysis.analysis,
      suggestedReplies: analysis.suggestedReplies,
      extractedName: analysis.extractedName,
      extractedEmail: analysis.extractedEmail,
      extractedPhone: analysis.extractedPhone,
      extractedAddress: analysis.extractedAddress,
      ticketRequested: analysis.ticketRequested,
      ticketSubject: analysis.ticketSubject,
      ticketDescription: analysis.ticketDescription,
      ticketPriority: analysis.ticketPriority,
    }, { status: 200 });
  } catch (error) {
    console.error('Error analyzing message:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
