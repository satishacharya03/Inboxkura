import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrg } from '@/lib/auth';

// GET — fetch knowledge base for active org
export async function GET() {
  try {
    const activeOrg = await getActiveOrg();
    if (!activeOrg) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const org = await prisma.organization.findUnique({
      where: { id: activeOrg.orgId },
      select: { knowledgeBase: true },
    });

    let kb = org?.knowledgeBase as any || null;
    if (kb) {
      const finalHours = (kb.operatingHours || kb.hours || '').trim();
      kb = {
        ...kb,
        hours: finalHours,
        operatingHours: finalHours,
      };
    }

    return NextResponse.json({ knowledgeBase: kb });
  } catch (error) {
    console.error('GET knowledge base error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT — save/update knowledge base (admin/owner only)
export async function PUT(request: Request) {
  try {
    const activeOrg = await getActiveOrg();
    if (!activeOrg) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });


    // Check role — only OWNER or ADMIN can update
    if (activeOrg.role !== 'OWNER' && activeOrg.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only owners and admins can update knowledge base' }, { status: 403 });
    }

    const body = await request.json();
    const { legalName, tagline, website, supportEmail, supportPhone, hours, operatingHours, about, faqs, updates, address } = body;

    const finalHours = (operatingHours || hours || '').trim();

    const knowledgeBase = {
      legalName: legalName || '',
      tagline: tagline || '',
      website: website || '',
      supportEmail: supportEmail || '',
      supportPhone: supportPhone || '',
      hours: finalHours,
      operatingHours: finalHours,
      about: about || '',
      faqs: faqs || [],
      updates: updates || '',
      address: address || '',
    };

    const org = await prisma.organization.update({
      where: { id: activeOrg.orgId },
      data: { knowledgeBase },
      select: { id: true, knowledgeBase: true },
    });

    return NextResponse.json({ success: true, knowledgeBase: org.knowledgeBase });
  } catch (error) {
    console.error('PUT knowledge base error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
