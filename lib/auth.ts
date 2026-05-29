import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { decrypt } from "@/lib/encryption";
import { User } from "@prisma/client";

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
        console.time("login-total");
        try {
          // Rate limiting
          console.time("login-rateLimit");
          const ip = getClientIp(req ?? {}, "auth-login");
          const limiter = await rateLimit("login", ip, { limit: 10, windowMs: 60_000 * 15 });
          console.timeEnd("login-rateLimit");
          if (!limiter.allowed) {
            throw new Error("Demasiados intentos. Intenta de nuevo más tarde.");
          }

          if (!credentials?.email || !credentials?.password) {
            throw new Error("Email y contraseña son requeridos");
          }

          const emailLower = credentials.email.toLowerCase();

          // Unified lookup: single User table
          console.time("login-findUser");
          const user = await prisma.user.findUnique({
            where: { email: emailLower },
          }) as User | null;
          console.timeEnd("login-findUser");

          if (!user || user.status !== "active") {
            throw new Error("Credenciales inválidas");
          }

          console.time("login-password");
          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
          console.timeEnd("login-password");
          if (!isValid) {
            throw new Error("Credenciales inválidas");
          }

          // Check MFA
          console.time("login-mfa");
          if (user && user.mfaEnabled && user.mfaSecret) {
            if (!credentials.mfaCode) {
              console.timeEnd("login-mfa");
              throw new Error("MFA_REQUIRED");
            }

            const { verifyMfaToken } = await import("@/domains/users/services/mfa.service");
            const isTokenValid = verifyMfaToken(credentials.mfaCode, decrypt(user.mfaSecret));

            if (!isTokenValid) {
              console.timeEnd("login-mfa");
              throw new Error("Código MFA inválido");
            }
          }
          console.timeEnd("login-mfa");

          // Update last login
          console.time("login-updateLastLogin");
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });
          console.timeEnd("login-updateLastLogin");

          // Determine role: admin users use adminRole, regular users use role
          const effectiveRole = user.isAdmin ? (user.adminRole || "admin") : (user.role || "owner");

          return {
            id: user.id,
            email: user.email,
            name: user.email,
            role: effectiveRole,
            accountId: user.accountId,
          };
        } finally {
          console.timeEnd("login-total");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accountId = user.accountId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.accountId = token.accountId;
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
