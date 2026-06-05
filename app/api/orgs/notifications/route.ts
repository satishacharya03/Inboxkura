import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrg } from '@/lib/auth';

export async function GET() {
  try {
    const org = await getActiveOrg();
    if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgData = await prisma.organization.findUnique({
      where: { id: org.orgId },
      select: { slackWebhookUrl: true },
    });

    return NextResponse.json({ slackWebhookUrl: orgData?.slackWebhookUrl || null });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const org = await getActiveOrg();
    if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['OWNER', 'ADMIN'].includes(org.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { slackWebhookUrl } = await req.json();

    await prisma.organization.update({
      where: { id: org.orgId },
      data: { slackWebhookUrl: slackWebhookUrl || null },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Test the Slack webhook by sending a test message
  try {
    const org = await getActiveOrg();
    if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { slackWebhookUrl } = await req.json();
    if (!slackWebhookUrl) return NextResponse.json({ error: 'No webhook URL' }, { status: 400 });

    const res = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '✅ Test notification from InboxKura — your Slack integration is working!' }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Slack webhook failed' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to test webhook' }, { status: 500 });
  }
}
