export function isQuotaSignature(errors: (string | null)[]): boolean {
  if (errors.length < 3) return false;
  return errors
    .slice(0, 3)
    .every((e) => /no credentials|login|quota|unauthorized|401|403/i.test(e ?? ""));
}

export function retentionCutoff(now: Date, retentionHours: number): string {
  return new Date(now.getTime() - retentionHours * 3600_000).toISOString();
}
