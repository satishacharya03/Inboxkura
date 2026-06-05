import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrg } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const activeOrg = await getActiveOrg();
    if (!activeOrg) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    const whereClause: any = { orgId: activeOrg.orgId };
    if (platform && platform !== 'ALL') {
      whereClause.platform = platform;
    }

    const contacts = await prisma.contact.findMany({
      where: whereClause,
      include: {
        messages: { orderBy: { timestamp: 'desc' }, take: 1 },
        tickets: true,
      },
    });

    // Sort by latest message timestamp
    contacts.sort((a, b) => {
      const aTime = a.messages[0]?.timestamp.getTime() || a.createdAt.getTime();
      const bTime = b.messages[0]?.timestamp.getTime() || b.createdAt.getTime();
      return bTime - aTime;
    });

    // ── Background profile refresh for top 10 FB/IG contacts ─────────────────
    // • FB contacts: refresh using FB Page token only
    // • IG contacts: refresh using IG Page token only
    // • No cross-platform token usage
    const now = Date.now();
    const toRefresh = contacts.slice(0, 10).filter(c => {
      if (c.platform !== 'FB' && c.platform !== 'IG') return false;
      const ageHours = (now - new Date(c.updatedAt).getTime()) / 3_600_000;
      return !c.name || ageHours > 12;
    });

    if (toRefresh.length > 0) {
      (async () => {
        try {
          const { fetchFBProfile, fetchIGProfile } = await import('@/app/api/webhook/shared');

          // Load platform configs once (not inside the loop)
          const fbConfig = await prisma.platformConfig.findFirst({
            where: { orgId: activeOrg.orgId, platform: 'FB' },
            select: { accessToken: true },
          });
          const igConfig = await prisma.platformConfig.findUnique({
            where: { orgId_platform: { orgId: activeOrg.orgId, platform: 'IG' } },
            select: { accessToken: true },
          });

          for (const c of toRefresh) {
            // FB contacts: only use FB token. IG contacts: only use IG token.
            const token = c.platform === 'FB' ? fbConfig?.accessToken : igConfig?.accessToken;
            if (!token) continue;

            const profile = c.platform === 'FB'
              ? await fetchFBProfile(c.platformId, token)
              : await fetchIGProfile(c.platformId, token, fbConfig?.accessToken || undefined);

            const newName = profile.name || c.name || null;
            const newAvatar = profile.profilePic || c.avatarUrl || null;

            if (newName !== c.name || newAvatar !== c.avatarUrl) {
              await prisma.contact.update({
                where: { id: c.id },
                data: {
                  name: newName ?? undefined,
                  avatarUrl: newAvatar ?? undefined,
                },
              });
              console.log(`[BG Refresh] Updated ${c.platform} contact ${c.platformId}: name="${newName}", avatar="${newAvatar}"`);
            }
          }
        } catch (e) {
          console.error('[BG Refresh] Failed:', e);
        }
      })();
    }

    // ── Map avatarUrl: FB and IG always use the proxy endpoint ────────────────
    // The /api/avatar route fetches live from Meta using the correct platform token.
    const mappedContacts = contacts.map(c => ({
      ...c,
      avatarUrl: (c.platform === 'FB' || c.platform === 'IG')
        ? `/api/avatar?platform=${c.platform}&platformId=${c.platformId}`
        : c.platform === 'TIKTOK' && c.avatarUrl && c.avatarUrl.startsWith('http')
        ? `/api/media-proxy?url=${encodeURIComponent(c.avatarUrl)}`
        : c.avatarUrl,
    }));

    return NextResponse.json(mappedContacts);
  } catch (error) {
    console.error('Fetch contacts error:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}
