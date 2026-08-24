import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: "USER" | "REVIEWER" | "ADMIN" } & DefaultSession["user"];
  }
  interface User {
    role?: "USER" | "REVIEWER" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "USER" | "REVIEWER" | "ADMIN";
  }
}
