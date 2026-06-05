import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrg } from '@/lib/auth';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const activeOrg = await getActiveOrg();
    if (!activeOrg) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: contactId } = await context.params;
    const body = await request.json();
    const { instructions } = body;

    if (!instructions || !instructions.trim()) {
      return NextResponse.json({ error: 'Missing instructions' }, { status: 400 });
    }

    // Verify contact belongs to this organization
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, orgId: activeOrg.orgId },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Process instructions using Gemini
    const prompt = `You are an expert AI prompt engineer.
Process the following raw user instructions to create a clear, actionable, and concise persona rule/profile that will guide an AI assistant when communicating with this specific customer.
Keep it extremely concise (MAX 80 words) and list exact rules (e.g. tone, response length, language preferences, formatting).

Raw instructions: "${instructions}"

Return the processed persona text directly, without any markdown formatting or wrapper.`;

    const geminiRes = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
    });

    const processedPersona = geminiRes.text?.trim() || instructions.trim();

    // Save to SQL Database on the Contact model
    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: { aiPersona: processedPersona },
    });

    return NextResponse.json({ success: true, aiPersona: processedPersona });
  } catch (error) {
    console.error('Save contact persona error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const activeOrg = await getActiveOrg();
    if (!activeOrg) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: contactId } = await context.params;

    // Verify contact belongs to this organization
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, orgId: activeOrg.orgId },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Clear persona in SQL Database
    await prisma.contact.update({
      where: { id: contactId },
      data: { aiPersona: null },
    });

    return NextResponse.json({ success: true, aiPersona: null });
  } catch (error) {
    console.error('Delete contact persona error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
