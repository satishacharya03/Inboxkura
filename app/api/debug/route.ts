import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const contacts = await prisma.contact.findMany({
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        }
      }
    });

    const debugData = contacts.map(c => ({
      name: c.name,
      platformId: c.platformId,
      messages: c.messages.map(m => ({
        id: m.id,
        text: m.text,
        isOutbound: m.isOutbound,
        timestamp: m.timestamp,
        repliedById: m.repliedById,
      }))
    }));

    return NextResponse.json(debugData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
