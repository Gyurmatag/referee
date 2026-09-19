export function visibleLog(text: string): string {
  return text.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "").replace(/\r/g, "");
}

export function judgeLabel(judge: string): string {
  if (judge === "build_e2e") return "Build and e2e";
  if (judge === "tracks") return "Tracks";
  if (judge === "review") return "Review";
  return judge;
}
