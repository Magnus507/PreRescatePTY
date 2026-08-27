import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { decrypt } from "@/lib/encryption";
import { User } from "@prisma/client";

export async function authorizeCredentials(
  credentials: { email?: string; password?: string; mfaCode?: string } | undefined,
  req?: Parameters<typeof getClientIp>[0]
) {
  // Rate limiting
  const ip = getClientIp(req ?? {}, "auth-login");
  const limiter = await rateLimit("login", ip, { limit: 10, windowMs: 60_000 * 15 });
  if (!limiter.allowed) {
    throw new Error("Demasiados intentos. Intenta de nuevo más tarde.");
  }

  if (!credentials?.email || !credentials?.password) {
    throw new Error("Email y contraseña son requeridos");
  }

  const emailLower = credentials.email.toLowerCase();

  // Unified lookup: single User table
  const user = await prisma.user.findUnique({
    where: { email: emailLower },
  }) as User | null;

  if (!user || user.status !== "active") {
    throw new Error("Credenciales inválidas");
  }

  const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
  if (!isValid) {
    throw new Error("Credenciales inválidas");
  }

  // Check MFA
  if (user && user.mfaEnabled && user.mfaSecret) {
    if (!credentials.mfaCode) {
      throw new Error("MFA_REQUIRED");
    }

    const { verifyMfaToken } = await import("@/domains/users/services/mfa.service");
    const isTokenValid = verifyMfaToken(credentials.mfaCode, decrypt(user.mfaSecret));

    if (!isTokenValid) {
      throw new Error("Código MFA inválido");
    }
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Determine role: admin users use adminRole, regular users use role
  const effectiveRole = user.isAdmin ? (user.adminRole || "admin") : (user.role || "owner");

  return {
    id: user.id,
    email: user.email,
    name: user.email,
    role: effectiveRole,
    accountId: user.accountId,
    sessionVersion: user.sessionVersion,
  };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    newUser: "/registro",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
        mfaCode: { label: "Código MFA", type: "text" },
      },
      async authorize(credentials, req) {
        return authorizeCredentials(credentials, req);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accountId = user.accountId;
        token.sessionVersion = user.sessionVersion;
        token.revoked = false;
        return token;
      }

      if (!token.id) return token;

      try {
        const currentUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            status: true,
            deletedAt: true,
            sessionVersion: true,
            role: true,
            isAdmin: true,
            adminRole: true,
            accountId: true,
          },
        });

        const sessionIsValid =
          currentUser !== null &&
          currentUser.status === "active" &&
          currentUser.deletedAt === null &&
          currentUser.sessionVersion === token.sessionVersion;

        if (!sessionIsValid) {
          token.revoked = true;
          return token;
        }

        token.revoked = false;
        token.role = currentUser.isAdmin
          ? (currentUser.adminRole || "admin")
          : (currentUser.role || "owner");
        token.accountId = currentUser.accountId;
        token.sessionVersion = currentUser.sessionVersion;
      } catch {
        // Fail closed when the current account state cannot be verified.
        token.revoked = true;
      }

      return token;
    },
    async session({ session, token }) {
      if (token.revoked || !token.id) {
        delete (session as { user?: unknown }).user;
        return session;
      }

      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.accountId = token.accountId;
        session.user.sessionVersion = token.sessionVersion;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      try {
        // Permite URLs relativas dentro del mismo sitio
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        // Permite URLs absolutas si pertenecen al mismo dominio
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) return url;
      } catch {
        // En caso de error (URL malformada), por defecto ir al origen
      }
      return baseUrl;
    },
  },

};
