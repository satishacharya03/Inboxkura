import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrg } from '@/lib/auth';

export async function GET() {
  try {
    const org = await getActiveOrg();
    if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const responses = await prisma.cannedResponse.findMany({
      where: { orgId: org.orgId },
      orderBy: { shortcut: 'asc' },
    });

    return NextResponse.json(responses);
  } catch (e) {
    console.error('GET /canned-responses:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const org = await getActiveOrg();
    if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['OWNER', 'ADMIN'].includes(org.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { shortcut, content } = await req.json();
    if (!shortcut?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Shortcut and content are required' }, { status: 400 });
    }

    const created = await prisma.cannedResponse.create({
      data: {
        orgId: org.orgId,
        shortcut: shortcut.trim().toLowerCase(),
        content: content.trim(),
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('POST /canned-responses:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
