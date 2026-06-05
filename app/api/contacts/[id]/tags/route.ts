import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrg } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const org = await getActiveOrg();
    if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tag } = await req.json();
    if (!tag || typeof tag !== 'string') return NextResponse.json({ error: 'Tag is required' }, { status: 400 });

    const contact = await prisma.contact.findFirst({
      where: { id, orgId: org.orgId },
    });
    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

    const cleanTag = tag.trim().toLowerCase();
    const existingTags = contact.tags || [];
    if (!existingTags.includes(cleanTag)) {
      await prisma.contact.update({
        where: { id },
        data: { tags: [...existingTags, cleanTag] },
      });
    }

    return NextResponse.json({ success: true, tags: [...existingTags, cleanTag] });
  } catch (e) {
    console.error('POST /contacts/[contactId]/tags:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const org = await getActiveOrg();
    if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tag } = await req.json();
    if (!tag) return NextResponse.json({ error: 'Tag is required' }, { status: 400 });

    const contact = await prisma.contact.findFirst({
      where: { id, orgId: org.orgId },
    });
    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

    const updated = (contact.tags || []).filter(t => t !== tag.trim().toLowerCase());
    await prisma.contact.update({
      where: { id },
      data: { tags: updated },
    });

    return NextResponse.json({ success: true, tags: updated });
  } catch (e) {
    console.error('DELETE /contacts/[contactId]/tags:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
