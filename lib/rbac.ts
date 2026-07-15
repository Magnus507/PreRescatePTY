import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";

/**
 * Roles autorizados para administración de órdenes
 */
export const ORDER_ADMIN_ROLES = ["admin", "superadmin", "imprenta"];

/**
 * Roles autorizados para administración general (sin imprenta)
 */
export const GENERAL_ADMIN_ROLES = ["admin", "superadmin"];

/**
 * Roles exclusivos de superadmin
 */
export const SUPERADMIN_ROLES = ["superadmin"];

/**
 * Verifica si el rol de sesión está incluido en la lista de roles permitidos.
 */
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

/**
 * Obtiene la sesión y valida que el usuario tenga uno de los roles permitidos.
 * Retorna la sesión si es válida, o una Response de error si no.
 */
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
