import { fixtures, SubmissionSchema } from "@referee/shared";
import { coreFetch } from "@/lib/core";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const res = await coreFetch(`/submissions/${id}`);
    if (res.ok) {
      const parsed = SubmissionSchema.safeParse(await res.json());
      if (parsed.success) return Response.json(parsed.data);
    }
  } catch {
    // fall through to fixtures so /dev-style ids still render
  }
  const raw =
    id.includes("fail")
      ? fixtures.failed
      : id.includes("run")
        ? fixtures.running
        : id.includes("done")
          ? fixtures.done
          : null;
  if (!raw) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(SubmissionSchema.parse(raw));
}
