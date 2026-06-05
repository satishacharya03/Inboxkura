import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrg } from '@/lib/auth';
import { randomBytes } from 'crypto';

function generateApiKey(): string {
  return 'ik_live_' + randomBytes(32).toString('hex');
}

export async function GET() {
  try {
    const org = await getActiveOrg();
    if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['OWNER', 'ADMIN'].includes(org.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const orgData = await prisma.organization.findUnique({
      where: { id: org.orgId },
      select: { apiKey: true },
    });

    // Mask the key: show first 16 chars, rest as asterisks
    const maskedKey = orgData?.apiKey
      ? orgData.apiKey.substring(0, 16) + '•'.repeat(32)
      : null;

    return NextResponse.json({ hasKey: !!orgData?.apiKey, maskedKey });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const org = await getActiveOrg();
    if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (org.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only owners can generate API keys' }, { status: 403 });
    }

    const newKey = generateApiKey();
    await prisma.organization.update({
      where: { id: org.orgId },
      data: { apiKey: newKey },
    });

    // Return full key ONCE (user must copy it now)
    return NextResponse.json({ apiKey: newKey, message: 'Save this key — it will not be shown again in full.' });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const org = await getActiveOrg();
    if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (org.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only owners can revoke API keys' }, { status: 403 });
    }

    await prisma.organization.update({
      where: { id: org.orgId },
      data: { apiKey: null },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
