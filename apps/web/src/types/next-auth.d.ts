import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    login?: string;
  }
  interface Session {
    user: DefaultSession["user"] & {
      login: string;
      githubId: number;
      roles: Array<"participant" | "organizer">;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    login?: string;
    githubId?: number;
    roles?: Array<"participant" | "organizer">;
  }
}
