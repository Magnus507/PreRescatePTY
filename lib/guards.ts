import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

/**
 * Basic authentication guard
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Check if current user is an admin
 */
export async function isAdmin() {
  const session = await getSession();
  if (!session?.user) return false;
  
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { 
      role: true,
      isAdmin: true,
      adminRole: true
    }
  });
  
  if (!user) return false;
  
  // Resolve effective role matching lib/auth.ts logic
  const effectiveRole = user.isAdmin ? (user.adminRole || "admin") : (user.role || "owner");
  
  return effectiveRole === "admin" || effectiveRole === "superadmin";
}

/**
 * Check if current user owns or manages an organization
 */
export async function isOrgManager(organizationId: string) {
  const session = await getSession();
  if (!session?.user) return false;
  
  const userId = session.user.id;
  const member = await prisma.organizationMember.findFirst({
    where: { 
      organizationId,
      profile: { userId },
      memberStatus: "active"
    }
  });
  
  return !!member;
}

/**
 * Check if the current user belongs to a specific account
 */
export async function belongsToAccount(accountId: string) {
  const session = await getSession();
  if (!session?.user) return false;
  
  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountId: true }
  });
  
  return user?.accountId === accountId;
}
/**
 * Higher-order function to wrap API handlers with Admin authentication and authorization.
 */
export function withAdminAuth(
  handler: (req: Request, session: unknown) => Promise<Response>,
  roles: string[] = ["admin", "superadmin", "imprenta"]
) {
  return async (req: Request) => {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const email = session.user.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "Email de sesión no encontrado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { 
        role: true,
        isAdmin: true,
        adminRole: true
      }
    });

    if (!user) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Resolve effective role matching lib/auth.ts logic
    const effectiveRole = user.isAdmin ? (user.adminRole || "admin") : (user.role || "owner");

    if (!roles.includes(effectiveRole)) {
      return new Response(JSON.stringify({ error: "Acceso denegado: solo personal autorizado" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    return handler(req, session);
  };
}
