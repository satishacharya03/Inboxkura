import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Platform } from '@prisma/client';
import { getAuthenticatedUser, getActiveOrg, requireRole } from '@/lib/auth';

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const activeOrg = await getActiveOrg(user);
  if (!activeOrg) return NextResponse.json({ error: 'No active organization' }, { status: 400 });

  const configs = await prisma.platformConfig.findMany({
    where: { orgId: activeOrg.orgId }
  });

  const status = {
    FB:       configs.some(c => c.platform === 'FB'       && !!c.accessToken),
    IG:       configs.some(c => c.platform === 'IG'       && !!c.accessToken),
    WA:       configs.some(c => c.platform === 'WA'       && !!c.accessToken && !!c.pageId),
    TIKTOK:   configs.some(c => c.platform === 'TIKTOK'   && (!!c.accessToken || !!c.pageId)),
    TELEGRAM: configs.some(c => c.platform === 'TELEGRAM' && !!c.pageId),
    role:     activeOrg.role,
    orgId:    activeOrg.orgId,
    configs:  configs.map(c => ({
      platform: c.platform,
      pageId: c.pageId,
      connectedName: c.connectedName,
      connectedEmail: c.connectedEmail,
      // For FB and IG, use a server-side proxy that re-fetches from Meta Graph API
      // so the profile picture never expires (CDN URLs from Meta expire quickly)
      connectedAvatar: (c.platform === 'FB' || c.platform === 'IG') && c.connectedAvatar
        ? `/api/platforms/avatar?platform=${c.platform}`
        : c.connectedAvatar
    })),
  };

  return NextResponse.json(status);
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const activeOrg = await getActiveOrg(user);
  if (!activeOrg) return NextResponse.json({ error: 'No active organization' }, { status: 400 });

  const guard = requireRole(activeOrg.role, 'ADMIN');
  if (guard) return guard;

  const { platform, pageId } = await request.json();
  if (!platform || !pageId) return NextResponse.json({ error: 'Missing platform or pageId' }, { status: 400 });
  if (!Object.values(Platform).includes(platform as Platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  const config = await prisma.platformConfig.upsert({
    where:  { orgId_platform: { orgId: activeOrg.orgId, platform: platform as Platform } },
    update: { pageId },
    create: { orgId: activeOrg.orgId, platform: platform as Platform, pageId, verifyToken: 'manual_setup' },
  });

  return NextResponse.json({ success: true, config });
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const activeOrg = await getActiveOrg(user);
  if (!activeOrg) return NextResponse.json({ error: 'No active organization' }, { status: 400 });

  const guard = requireRole(activeOrg.role, 'ADMIN');
  if (guard) return guard;

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform');
  if (!platform || !Object.values(Platform).includes(platform as Platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  await prisma.platformConfig.delete({
    where: { orgId_platform: { orgId: activeOrg.orgId, platform: platform as Platform } },
  });

  return NextResponse.json({ success: true, platform });
}
