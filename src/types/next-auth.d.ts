import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      tenantId: string;
      tenantSlug: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
    tenantId: string;
    tenantSlug: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    tenantId: string;
    tenantSlug: string;
  }
}