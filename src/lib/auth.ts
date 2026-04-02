import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "prerescatepty-dev-secret-change-in-production-2024",
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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email y contraseña son requeridos");
        }

        const emailLower = credentials.email.toLowerCase();

        // 1. Try to find an admin user first
        const admin = await prisma.adminUser.findUnique({
          where: { email: emailLower },
        });

        if (admin && admin.status === "active") {
          const isValid = await bcrypt.compare(credentials.password, admin.passwordHash);
          if (isValid) {
            return {
              id: admin.id,
              email: admin.email,
              name: admin.email,
              role: admin.role, // "admin" or "superadmin"
            };
          }
        }

        // 2. Try to find a regular user
        const user = await prisma.user.findUnique({
          where: { email: emailLower },
        });

        if (user && user.status === "active") {
          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (isValid) {
            await prisma.user.update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() },
            });
            return {
              id: user.id,
              email: user.email,
              name: user.email,
              role: "user",
            };
          }
        }

        throw new Error("Credenciales inválidas");
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id = token.id as string;
        (session.user as { id?: string; role?: string }).role = token.role as string;
      }
      return session;
    },
  },
};
