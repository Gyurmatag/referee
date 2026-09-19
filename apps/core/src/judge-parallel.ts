export function judgesStartTogether(flag: string | undefined): boolean {
  return String(flag ?? "").trim().toLowerCase() === "true";
}
