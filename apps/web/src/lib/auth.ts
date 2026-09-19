export const organizerLogins = (process.env.ORGANIZER_LOGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
