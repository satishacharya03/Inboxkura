import { cookies } from 'next/headers';
import * as jose from 'jose';
import { prisma } from '@/lib/prisma';
import { OrgRole } from '@prisma/client';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_dev_only');

export interface AuthUser {
  userId: string;
  email: string;
}

export interface ActiveOrg {
  orgId: string;
  role: OrgRole;
  userId: string;
}

// ── Get authenticated user from JWT cookie ────────────────────────────────────
export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;

    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email:  payload.email  as string,
    };
  } catch {
    return null;
  }
}

// ── Get active org + verify user is a member ─────────────────────────────────
export async function getActiveOrg(authUser?: AuthUser | null): Promise<ActiveOrg | null> {
  try {
    const user = authUser ?? await getAuthenticatedUser();
    if (!user) return null;

    const cookieStore = await cookies();
    const orgId = cookieStore.get('active_org_id')?.value;
    if (!orgId) return null;

    const member = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: user.userId } },
    });
    if (!member) return null;

    return { orgId, role: member.role, userId: user.userId };
  } catch {
    return null;
  }
}

// ── Role hierarchy check ──────────────────────────────────────────────────────
const ROLE_RANK: Record<OrgRole, number> = {
  OWNER:   3,
  ADMIN:   2,
  MANAGER: 1,
};

export function hasRole(userRole: OrgRole, minRole: OrgRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole];
}

// ── Convenience: require at least minRole, return 403 response if not ────────
export function requireRole(role: OrgRole, minRole: OrgRole): Response | null {
  if (!hasRole(role, minRole)) {
    return new Response(
      JSON.stringify({ error: `Requires ${minRole} role or higher` }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return null;
}
