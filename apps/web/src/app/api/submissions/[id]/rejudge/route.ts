import { auth } from "@/auth";
import { coreFetch } from "@/lib/core";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.login) {
    return Response.json({ error: "Sign in with GitHub first" }, { status: 401 });
  }
  const { id } = await context.params;
  const res = await coreFetch(`/submissions/${id}/rejudge`, {
    method: "POST",
    headers: { "x-user-id": session.user.login },
  });
  const json = await res.json().catch(() => ({ error: "core unavailable" }));
  return Response.json(json, { status: res.status });
}
