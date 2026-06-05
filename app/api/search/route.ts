import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrg } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const org = await getActiveOrg();
    if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    if (!q || q.length < 2) return NextResponse.json({ contacts: [], messages: [], tickets: [] });

    const [contacts, messages, tickets] = await Promise.all([
      prisma.contact.findMany({
        where: {
          orgId: org.orgId,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { platformId: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: { id: true, name: true, platform: true, platformId: true, avatarUrl: true },
      }),
      prisma.message.findMany({
        where: {
          orgId: org.orgId,
          text: { contains: q, mode: 'insensitive' },
        },
        take: 20,
        orderBy: { timestamp: 'desc' },
        include: {
          contact: { select: { id: true, name: true, platform: true, platformId: true, avatarUrl: true } },
        },
      }),
      prisma.ticket.findMany({
        where: {
          orgId: org.orgId,
          OR: [
            { subject: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 10,
        include: { contact: { select: { id: true, name: true, platform: true, platformId: true } } },
      }),
    ]);

    return NextResponse.json({ contacts, messages, tickets });
  } catch (e) {
    console.error('GET /search:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
