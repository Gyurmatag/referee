import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { organizerLogins } from "@/lib/auth";

const DEMO_USER = process.env.DEMO_JUDGE_USER || "judge@referee.dev";
const DEMO_PASS = process.env.DEMO_JUDGE_PASS || "devin-admin";

function rolesFor(login: string): Array<"participant" | "organizer"> {
  const roles: Array<"participant" | "organizer"> = ["participant"];
  if (organizerLogins.includes(login)) roles.push("organizer");
  return roles;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      // GitHub now sends RFC 9207 `iss`; Auth.js must expect the same value.
      issuer: "https://github.com/login/oauth",
    }),
    Credentials({
      id: "demo",
      name: "Judge login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        const email = String(credentials?.email ?? "");
        const password = String(credentials?.password ?? "");
        if (email === DEMO_USER && password === DEMO_PASS) {
          return {
            id: "user_Gyurmatag",
            name: "Gyurmatag",
            email: DEMO_USER,
            login: "Gyurmatag",
          };
        }
        return null;
      },
    }),
  ],
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user, profile, trigger, session }) {
      if (user?.login) {
        token.login = user.login;
        token.roles = rolesFor(user.login);
        if (user.name) token.name = user.name;
      }
      if (profile && typeof profile === "object") {
        const p = profile as { login?: string; id?: number; avatar_url?: string };
        token.login = p.login;
        token.githubId = p.id;
        token.picture = p.avatar_url ?? token.picture;
        if (typeof p.login === "string") token.roles = rolesFor(p.login);
      }
      if (trigger === "update" && session && typeof session.name === "string") {
        token.name = session.name;
      }
      if (!token.roles && typeof token.login === "string") {
        token.roles = rolesFor(token.login);
      }
      return token;
    },
    session({ session, token }) {
      session.user.login = typeof token.login === "string" ? token.login : "";
      session.user.githubId = typeof token.githubId === "number" ? token.githubId : 0;
      session.user.image = typeof token.picture === "string" ? token.picture : session.user.image;
      if (typeof token.name === "string") session.user.name = token.name;
      session.user.roles = Array.isArray(token.roles)
        ? (token.roles as Array<"participant" | "organizer">)
        : rolesFor(session.user.login);
      return session;
    },
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/`;
    },
  },
});
