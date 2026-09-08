import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";

/** Review/payment/destructive order actions. Print-shop users must never receive these. */
export const ORDER_REVIEW_ROLES = ["admin", "superadmin"];

/** Fulfilment actions that the print shop needs to perform. */
export const ORDER_FULFILLMENT_ROLES = ["admin", "superadmin", "imprenta"];

/**
 * Roles autorizados para administración general (sin imprenta)
 */
export const GENERAL_ADMIN_ROLES = ["admin", "superadmin"];

/**
 * Roles exclusivos de superadmin
 */
export const SUPERADMIN_ROLES = ["superadmin"];

export function hasRole(
  role: string | undefined | null,
  allowedRoles: string[]
): boolean {
  if (!role) return false;
  return allowedRoles.includes(role);
}

export type AuthSuccess = { authorized: true; session: Session };
export type AuthFailure = { authorized: false; response: Response };
export type AuthResult = AuthSuccess | AuthFailure;

type CurrentAuthState = {
  id: string;
  status: string;
  role: string;
  adminRole: string | null;
  isAdmin: boolean;
  accountId: string | null;
  sessionVersion: number;
  deletedAt: Date | null;
  mfaEnabled: boolean;
  mfaSecret: string | null;
};

async function loadCurrentAuthState(userId: string): Promise<CurrentAuthState | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      role: true,
      adminRole: true,
      isAdmin: true,
      accountId: true,
      sessionVersion: true,
      deletedAt: true,
      mfaEnabled: true,
      mfaSecret: true,
    },
  });
}

function getEffectiveRole(user: CurrentAuthState) {
  return user.isAdmin ? (user.adminRole || "admin") : (user.role || "owner");
}

async function assertFreshSession(session: Session) {
  const current = await loadCurrentAuthState(session.user.id);
  if (!current) {
    return { ok: false as const, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }

  if (
    current.deletedAt ||
    (current.status !== undefined && current.status !== "active")
  ) {
    return { ok: false as const, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }

  if (current.sessionVersion !== undefined && current.sessionVersion !== session.user.sessionVersion) {
    return { ok: false as const, response: NextResponse.json({ error: "Sesión revocada" }, { status: 401 }) };
  }

  return {
    ok: true as const,
    current: {
      ...current,
      status: current.status ?? "active",
      sessionVersion: current.sessionVersion ?? session.user.sessionVersion,
    },
  };
}

export async function requireRole(
  allowedRoles: string[]
): Promise<AuthResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  const fresh = await assertFreshSession(session);
  if (!fresh.ok) return { authorized: false, response: fresh.response };

  if (!hasRole(getEffectiveRole(fresh.current), allowedRoles)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acceso denegado: solo personal autorizado" },
        { status: 403 }
      ),
    };
  }

  // Privileged personnel must enroll a working second factor before any admin
  // API is usable. MFA setup/enable endpoints intentionally use
  // requireFreshSession(), so an existing administrator can enroll without a
  // database intervention and is not permanently locked out.
  if (fresh.current.isAdmin && (!fresh.current.mfaEnabled || !fresh.current.mfaSecret)) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error: "MFA obligatorio para acceso administrativo",
          code: "MFA_ENROLLMENT_REQUIRED",
          setupUrl: "/admin/security/mfa",
        },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, session };
}

export async function requireActiveAccountSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  const fresh = await assertFreshSession(session);
  if (!fresh.ok) return { authorized: false as const, response: fresh.response };

  if (!fresh.current.accountId) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  return {
    authorized: true as const,
    session,
    current: fresh.current as CurrentAuthState & { accountId: string },
  };
}

export async function requireFreshSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  const fresh = await assertFreshSession(session);
  if (!fresh.ok) return { authorized: false as const, response: fresh.response };

  return {
    authorized: true as const,
    session,
    current: fresh.current,
  };
}

export async function bumpUserSessionVersion(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
    select: { id: true, sessionVersion: true },
  });
}
