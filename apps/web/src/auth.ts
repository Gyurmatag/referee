import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { organizerLogins } from "@/lib/auth";

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
  ],
  trustHost: true,
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, profile }) {
      if (profile && typeof profile === "object") {
        const p = profile as { login?: string; id?: number; avatar_url?: string };
        token.login = p.login;
        token.githubId = p.id;
        token.picture = p.avatar_url ?? token.picture;
        if (typeof p.login === "string") token.roles = rolesFor(p.login);
      }
      if (!token.roles && typeof token.login === "string") {
        token.roles = rolesFor(token.login);
      }
      return token;
    },
    session({ session, token }) {
      session.user.login = typeof token.login === "string" ? token.login : "";
      session.user.githubId = typeof token.githubId === "number" ? token.githubId : 0;
      session.user.roles = Array.isArray(token.roles)
        ? (token.roles as Array<"participant" | "organizer">)
        : rolesFor(session.user.login);
      return session;
    },
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/submit`;
    },
  },
});
