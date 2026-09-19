import { auth } from "@/auth";
import { organizerLogins } from "@/lib/auth";

export async function currentLogin(): Promise<string> {
  const session = await auth();
  return session?.user?.login ?? "";
}

export async function requireOrganizer(): Promise<{ login: string } | Response> {
  const login = await currentLogin();
  if (!login) return Response.json({ error: "Sign in with GitHub first" }, { status: 401 });
  if (organizerLogins.length > 0 && !organizerLogins.includes(login)) {
    return Response.json({ error: "Organizer only" }, { status: 403 });
  }
  return { login };
}

export function isOrganizerLogin(login: string): boolean {
  if (organizerLogins.length === 0) return Boolean(login);
  return organizerLogins.includes(login);
}
