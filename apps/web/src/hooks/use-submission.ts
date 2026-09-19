import { SubmissionSchema, type Submission } from "@referee/shared";
import useSWR from "swr";
import { SWR_REFRESH_MS } from "@/lib/swr";

const fetcher = async (url: string): Promise<Submission> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("submission not found");
  return SubmissionSchema.parse(await res.json());
};

export function useSubmission(id: string | undefined, refreshMs = SWR_REFRESH_MS) {
  return useSWR(id ? `/api/submissions/${id}` : null, fetcher, {
    refreshInterval: refreshMs,
  });
}
