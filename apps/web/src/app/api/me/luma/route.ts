import { auth } from "@/auth";
import { cookies } from "next/headers";
import { z } from "zod";
import { coreFetch } from "@/lib/core";

const Body = z.object({ luma_email: z.string().email() });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Valid Luma email required" }, { status: 400 });
  }
  const jar = await cookies();
  jar.set("luma_email", parsed.data.luma_email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  const session = await auth();
  if (session?.user?.login) {
    await coreFetch("/users/me", {
      method: "POST",
      headers: { "x-user-id": session.user.login },
      body: JSON.stringify({
        github_login: session.user.login,
        github_id: session.user.githubId,
        name: session.user.name,
        avatar_url: session.user.image,
        luma_email: parsed.data.luma_email,
      }),
    }).catch(() => null);
  }
  return Response.json({ ok: true, luma_email: parsed.data.luma_email });
}

export async function GET() {
  const jar = await cookies();
  return Response.json({ luma_email: jar.get("luma_email")?.value ?? null });
}
