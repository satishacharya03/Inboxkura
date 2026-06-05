import { NextResponse } from 'next/server';
import { getAuthenticatedUser, getActiveOrg } from '@/lib/auth';
import { chatWithGemini } from '@/lib/gemini';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const activeOrg = await getActiveOrg(user);
    if (!activeOrg) return NextResponse.json({ error: 'No active organization' }, { status: 400 });

    const { prompt, chatHistory, context, olderContext, contactPersona, contactId } = await request.json();
    if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });

    // Load fallback global persona if not provided
    let effectivePersona = contactPersona;
    if (!effectivePersona) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { aiPersona: true }
      });
      effectivePersona = dbUser?.aiPersona || undefined;
    }

    // Fetch platform config / representative details
    const platformConfig = await prisma.platformConfig.findFirst({
      where: { orgId: activeOrg.orgId, connectedName: { not: null } },
      select: { connectedName: true }
    });
    const org = await prisma.organization.findUnique({
      where: { id: activeOrg.orgId },
      select: { name: true, knowledgeBase: true }
    });
    const dbUserRecord = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { name: true }
    });
    const connectedName = platformConfig?.connectedName || dbUserRecord?.name || undefined;
    const orgName = org?.name || undefined;
    const knowledgeBase = org?.knowledgeBase as Record<string, any> | null || null;

    // Fetch stored conversation context if contactId provided
    let conversationContext: string | null = null;
    if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, orgId: activeOrg.orgId },
        select: { conversationContext: true },
      });
      conversationContext = contact?.conversationContext || null;
    }

    const responseText = await chatWithGemini(
      prompt,
      chatHistory || [],
      context || '',
      olderContext || '',
      effectivePersona,
      connectedName,
      orgName,
      knowledgeBase,
      conversationContext
    );

    return NextResponse.json({ text: responseText }, { status: 200 });
  } catch (error) {
    console.error('Error in AI Chat:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
