import { auth } from "@/auth";
import { CreateSubmissionSchema } from "@referee/shared";
import { coreFetch } from "@/lib/core";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.login) {
    return Response.json({ error: "Sign in with GitHub first" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = CreateSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "invalid submission" },
      { status: 400 },
    );
  }
  await coreFetch("/users/me", {
    method: "POST",
    headers: { "x-user-id": session.user.login },
    body: JSON.stringify({
      github_login: session.user.login,
      github_id: session.user.githubId,
      name: session.user.name,
      avatar_url: session.user.image,
    }),
  }).catch(() => null);
  const res = await coreFetch("/submissions", {
    method: "POST",
    headers: { "x-user-id": session.user.login },
    body: JSON.stringify(parsed.data),
  });
  const json = await res.json().catch(() => ({ error: "core unavailable" }));
  return Response.json(json, { status: res.status });
}
