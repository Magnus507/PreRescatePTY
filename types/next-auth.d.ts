import "next-auth";
import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  /**
   * Extiende el objeto user de NextAuth
   */
  interface User extends DefaultUser {
    id: string;
    role: string;
    accountId?: string | null;
  }

  /**
   * Extiende el objeto session de NextAuth
   */
  interface Session {
    user: {
      id: string;
      role: string;
      accountId?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  /**
   * Extiende el objeto JWT de NextAuth
   */
  interface JWT {
    id: string;
    role: string;
    accountId?: string | null;
  }
}
