import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { decrypt } from "@/lib/encryption";
import { User } from "@prisma/client";
import {
  consumeMfaRecoveryCode,
  consumeVerifiedMfaTotp,
  isRecoveryCode,
  verifyMfaToken,
} from "@/domains/users/services/mfa.service";

type StoredSessionState = {
  status: string;
  deletedAt: Date | null;
  sessionVersion: number;
} | null;

export function isStoredSessionValid(
  currentUser: StoredSessionState,
  tokenSessionVersion: unknown
): boolean {
  return Boolean(
    currentUser &&
    currentUser.status === "active" &&
    currentUser.deletedAt === null &&
    typeof tokenSessionVersion === "number" &&
    currentUser.sessionVersion === tokenSessionVersion
  );
}

export async function authorizeCredentials(
  credentials: { email?: string; password?: string; mfaCode?: string } | undefined,
  req?: Parameters<typeof getClientIp>[0]
) {
  const ip = getClientIp(req ?? {}, "auth-login");
  const limiter = await rateLimit("login", ip, { limit: 10, windowMs: 60_000 * 15 });
  if (!limiter.allowed) {
    throw new Error("Demasiados intentos. Intenta de nuevo más tarde.");
  }

  if (!credentials?.email || !credentials?.password) {
    throw new Error("Email y contraseña son requeridos");
  }

  const emailLower = credentials.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: emailLower },
  }) as User | null;

  if (!user || user.status !== "active" || user.deletedAt) {
    throw new Error("Credenciales inválidas");
  }

  const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
  if (!isValid) {
    throw new Error("Credenciales inválidas");
  }

  if (user.mfaEnabled !== Boolean(user.mfaSecret)) {
    throw new Error("Configuración MFA inconsistente");
  }

  let effectiveSessionVersion = user.sessionVersion;
  if (user.mfaEnabled) {
    if (!credentials.mfaCode || !user.mfaSecret) {
      throw new Error("MFA_REQUIRED");
    }

    try {
      if (isRecoveryCode(credentials.mfaCode)) {
        effectiveSessionVersion = await prisma.$transaction(async (tx) => {
          const consumed = await consumeMfaRecoveryCode(tx, user.id, credentials.mfaCode!);
          if (!consumed) throw new Error("INVALID_MFA");
          const updated = await tx.user.update({
            where: { id: user.id },
            data: { sessionVersion: { increment: 1 } },
            select: { sessionVersion: true },
          });
          return updated.sessionVersion;
        });
      } else {
        const secret = decrypt(user.mfaSecret);
        if (!verifyMfaToken(credentials.mfaCode, secret)) {
          throw new Error("INVALID_MFA");
        }
        const consumed = await prisma.$transaction((tx) =>
          consumeVerifiedMfaTotp(tx, user.id, credentials.mfaCode!)
        );
        if (!consumed) throw new Error("INVALID_MFA");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_MFA") {
        throw new Error("Código MFA inválido o ya utilizado");
      }
      throw new Error("No se pudo verificar MFA");
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const effectiveRole = user.isAdmin ? (user.adminRole || "admin") : (user.role || "owner");

  return {
    id: user.id,
    email: user.email,
    name: user.email,
    role: effectiveRole,
    accountId: user.accountId,
    sessionVersion: effectiveSessionVersion,
  };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
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

        if (!currentUser || !isStoredSessionValid(currentUser, token.sessionVersion)) {
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
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) return url;
      } catch {
        // Malformed redirects fall back to the application origin.
      }
      return baseUrl;
    },
  },
};
