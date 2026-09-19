import { parseJudgeReport, type JudgeReport } from "@referee/shared";

export async function putText(
  bucket: R2Bucket,
  key: string,
  body: string,
  contentType = "application/json",
): Promise<string> {
  await bucket.put(key, body, { httpMetadata: { contentType } });
  return key;
}

export async function putBytes(
  bucket: R2Bucket,
  key: string,
  body: ArrayBuffer | Uint8Array | string,
  contentType: string,
): Promise<string> {
  await bucket.put(key, body, { httpMetadata: { contentType } });
  return key;
}

export function evidenceKey(submissionId: string, judge: string, file: string): string {
  const safe = file.replace(/^\/+/, "").replace(/^out\//, "");
  return `submissions/${submissionId}/${judge}/${safe}`;
}

export function parseReportText(text: string): JudgeReport | null {
  try {
    const parsed = parseJudgeReport(JSON.parse(text));
    return parsed.report;
  } catch {
    return null;
  }
}

export function guessContentType(name: string): string {
  if (name.endsWith(".webm")) return "video/webm";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".json")) return "application/json";
  if (name.endsWith(".log") || name.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}
