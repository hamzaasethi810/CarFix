import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "REVIEWER" | "ADMIN";
      /** Whether a second factor is enrolled, so layouts can gate on it. */
      mfaEnabled: boolean;
    } & DefaultSession["user"];
  }
  interface User {
    role?: "USER" | "REVIEWER" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "USER" | "REVIEWER" | "ADMIN";
    mfaEnabled?: boolean;
  }
}
