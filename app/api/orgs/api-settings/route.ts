import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, getActiveOrg } from '@/lib/auth';
import crypto from 'crypto';

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const activeOrg = await getActiveOrg(user);
  if (!activeOrg) return NextResponse.json({ error: 'No active organization' }, { status: 400 });

  const org = await prisma.organization.findUnique({
    where: { id: activeOrg.orgId },
    select: { apiWebhookUrl: true, apiKey: true },
  });

  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  // Do not return the full API key for security reasons, just a masked version if it exists
  const hasApiKey = !!org.apiKey;
  const maskedApiKey = hasApiKey 
    ? `sk_live_${'*'.repeat(16)}${org.apiKey!.slice(-4)}`
    : null;

  return NextResponse.json({
    success: true,
    apiWebhookUrl: org.apiWebhookUrl,
    hasApiKey,
    maskedApiKey,
  });
}

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const activeOrg = await getActiveOrg(user);
  if (!activeOrg) return NextResponse.json({ error: 'No active organization' }, { status: 400 });

  // Generate a new API key
  const newApiKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;

  await prisma.organization.update({
    where: { id: activeOrg.orgId },
    data: { apiKey: newApiKey },
  });

  return NextResponse.json({
    success: true,
    apiKey: newApiKey,
    message: 'API Key generated successfully. Please copy it now as you will not be able to see it again.',
  });
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const activeOrg = await getActiveOrg(user);
  if (!activeOrg) return NextResponse.json({ error: 'No active organization' }, { status: 400 });

  try {
    const { apiWebhookUrl } = await request.json();

    await prisma.organization.update({
      where: { id: activeOrg.orgId },
      data: { apiWebhookUrl },
    });

    return NextResponse.json({ success: true, apiWebhookUrl });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
