import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, getActiveOrg } from '@/lib/auth';
import { cookies } from 'next/headers';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// GET /api/orgs — list all orgs the current user belongs to
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const memberships = await prisma.orgMember.findMany({
    where: { userId: user.userId },
    include: {
      org: {
        include: {
          _count: { select: { members: true, messages: true } },
          platformConfigs: { select: { platform: true, pageId: true, accessToken: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const activeOrg = await getActiveOrg(user);

  return NextResponse.json({
    activeOrgId: activeOrg?.orgId ?? memberships[0]?.orgId ?? null,
    orgs: memberships.map(m => ({
      orgId:        m.orgId,
      name:         m.org.name,
      slug:         m.org.slug,
      role:         m.role,
      memberCount:  m.org._count.members,
      messageCount: m.org._count.messages,
      platforms:    m.org.platformConfigs.map(c => ({
        platform:     c.platform,
        connected:    !!(c.accessToken || c.pageId),
      })),
    })),
  });
}

// POST /api/orgs — create a new organization
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });

  const baseSlug = slugify(name.trim());
  let slug = baseSlug;
  let i = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${i++}`;
  }

  const org = await prisma.organization.create({
    data: {
      name: name.trim(),
      slug,
      members: {
        create: { userId: user.userId, role: 'OWNER' },
      },
    },
  });

  // Set as active org
  const cookieStore = await cookies();
  cookieStore.set('active_org_id', org.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  return NextResponse.json({ success: true, org: { id: org.id, name: org.name, slug: org.slug } }, { status: 201 });
}
