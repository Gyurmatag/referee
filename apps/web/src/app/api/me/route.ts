import { auth } from "@/auth";
import { coreFetch } from "@/lib/core";

export async function GET() {
  const session = await auth();
  if (!session?.user?.login) {
    return Response.json({ error: "Sign in with GitHub first" }, { status: 401 });
  }
  const res = await coreFetch("/users/me", {
    method: "POST",
    headers: { "x-user-id": session.user.login },
    body: JSON.stringify({
      github_login: session.user.login,
      github_id: session.user.githubId,
      name: session.user.name,
      avatar_url: session.user.image,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    role?: string;
    roles?: string[];
    luma_verified?: boolean;
    name?: string | null;
  };
  return Response.json({
    login: session.user.login,
    name: json.name ?? session.user.name ?? session.user.login,
    roles: session.user.roles,
    role: json.role ?? session.user.roles.join(","),
    luma_verified: json.luma_verified ?? false,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.login) {
    return Response.json({ error: "Sign in with GitHub first" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const res = await coreFetch("/users/me", {
    method: "PATCH",
    headers: { "x-user-id": session.user.login },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return Response.json(json, { status: res.status });
}
