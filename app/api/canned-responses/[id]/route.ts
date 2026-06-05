import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrg } from '@/lib/auth';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const org = await getActiveOrg();
    if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['OWNER', 'ADMIN'].includes(org.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const response = await prisma.cannedResponse.findFirst({
      where: { id, orgId: org.orgId },
    });
    if (!response) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.cannedResponse.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE /canned-responses/[id]:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const org = await getActiveOrg();
    if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['OWNER', 'ADMIN'].includes(org.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { shortcut, content } = await req.json();
    const response = await prisma.cannedResponse.findFirst({
      where: { id, orgId: org.orgId },
    });
    if (!response) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await prisma.cannedResponse.update({
      where: { id },
      data: {
        ...(shortcut && { shortcut: shortcut.trim().toLowerCase() }),
        ...(content && { content: content.trim() }),
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('PATCH /canned-responses/[id]:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
