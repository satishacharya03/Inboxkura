import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true, email: true, name: true, aiPersona: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: dbUser });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, aiPersona, instructions } = body;

    let targetPersona = aiPersona;

    // If raw instructions are provided, refine them using Gemini (similar to contact persona refinement)
    if (instructions !== undefined && instructions !== null) {
      if (instructions.trim() === '') {
        targetPersona = null;
      } else {
        const prompt = `You are an expert AI prompt engineer.
Process the following raw user instructions to create a clear, actionable, and concise global persona rule/profile that will guide an AI assistant when communicating with all customers.
Keep it extremely concise (MAX 80 words) and list exact rules (e.g. tone, response length, language preferences, formatting).

Raw instructions: "${instructions}"

Return the processed persona text directly, without any markdown formatting or wrapper.`;

        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
        });

        targetPersona = geminiRes.text?.trim() || instructions.trim();
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: {
        ...(name !== undefined && { name: name?.trim() || null }),
        ...((targetPersona !== undefined || instructions !== undefined) && { aiPersona: targetPersona }),
      },
      select: { id: true, email: true, name: true, aiPersona: true },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
