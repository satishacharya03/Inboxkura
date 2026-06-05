import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrg } from '@/lib/auth';

const DEFAULT_HANDOFF_TRIGGERS = [
  "talk to a human",
  "real person please",
  "I want to speak to someone",
  "disappointing",
  "bad service",
  "worst service",
  "I want to return",
  "I need a refund",
  "not satisfied",
  "I need a manager",
  "file a complaint",
  "manche sanga kura garna",
  "manxe chainxa",
  "ramro chaina"
];

// GET — fetch AI settings for active org
export async function GET() {
  try {
    const activeOrg = await getActiveOrg();
    if (!activeOrg) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const org = await prisma.organization.findUnique({
      where: { id: activeOrg.orgId },
      select: {
        aiLanguage: true,
        audioTranscriptions: true,
        imageUnderstanding: true,
        handoffTriggers: true,
        autoCreateTicket: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Populate defaults if handoffTriggers array is empty
    const handoffTriggers = org.handoffTriggers.length > 0 ? org.handoffTriggers : DEFAULT_HANDOFF_TRIGGERS;

    return NextResponse.json({
      aiLanguage: org.aiLanguage,
      audioTranscriptions: org.audioTranscriptions,
      imageUnderstanding: org.imageUnderstanding,
      handoffTriggers,
      autoCreateTicket: org.autoCreateTicket,
    });
  } catch (error) {
    console.error('GET AI settings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT — update AI settings for active org (admin/owner only)
export async function PUT(request: Request) {
  try {
    const activeOrg = await getActiveOrg();
    if (!activeOrg) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (activeOrg.role !== 'OWNER' && activeOrg.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only owners and admins can update AI settings' }, { status: 403 });
    }

    const body = await request.json();
    const { aiLanguage, audioTranscriptions, imageUnderstanding, handoffTriggers, autoCreateTicket } = body;

    const org = await prisma.organization.update({
      where: { id: activeOrg.orgId },
      data: {
        aiLanguage: aiLanguage !== undefined ? aiLanguage : undefined,
        audioTranscriptions: audioTranscriptions !== undefined ? audioTranscriptions : undefined,
        imageUnderstanding: imageUnderstanding !== undefined ? imageUnderstanding : undefined,
        handoffTriggers: Array.isArray(handoffTriggers) ? handoffTriggers : undefined,
        autoCreateTicket: autoCreateTicket !== undefined ? autoCreateTicket : undefined,
      },
      select: {
        id: true,
        aiLanguage: true,
        audioTranscriptions: true,
        imageUnderstanding: true,
        handoffTriggers: true,
        autoCreateTicket: true,
      },
    });

    return NextResponse.json({ success: true, aiSettings: org });
  } catch (error) {
    console.error('PUT AI settings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
