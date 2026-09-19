export function isDevinPr(input: {
  user?: string;
  title?: string;
  body?: string;
}): boolean {
  const blob = `${input.user ?? ""} ${input.title ?? ""} ${input.body ?? ""}`;
  return /devin/i.test(blob);
}
