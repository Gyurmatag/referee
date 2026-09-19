import { describe, expect, it } from "vitest";
import { roleColumn, rolesForLogin } from "../src/roles.js";

describe("roles", () => {
  it("gives Gyurmatag both participant and organizer", () => {
    expect(rolesForLogin("Gyurmatag", "Gyurmatag")).toEqual(["participant", "organizer"]);
    expect(roleColumn("Gyurmatag", "Gyurmatag")).toBe("participant,organizer");
  });

  it("keeps other logins as participant only", () => {
    expect(rolesForLogin("other", "Gyurmatag")).toEqual(["participant"]);
  });
});
