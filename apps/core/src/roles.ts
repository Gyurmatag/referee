export function rolesForLogin(login: string, organizerLogins = ""): string[] {
  const roles = ["participant"];
  const organizers = organizerLogins
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (organizers.includes(login)) roles.push("organizer");
  return roles;
}

export function roleColumn(login: string, organizerLogins = ""): string {
  return rolesForLogin(login, organizerLogins).join(",");
}
