import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

  if (!hasRole(session.user.role, allowedRoles)) {
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
