import { describe, expect, it } from "vitest";
import { mergeDemoLogin, parseDemoLogin, redactDemoLogin } from "./demo-login.js";

describe("demo login hints", () => {
  it("parses and redacts demo credentials from run hints", () => {
    const hints = mergeDemoLogin("start with npm start", "judge@example.com", "secret");
    expect(parseDemoLogin(hints)).toEqual({ user: "judge@example.com", password: "secret" });
    expect(redactDemoLogin(hints)).toContain("DEMO_PASS=***");
    expect(redactDemoLogin(hints)).not.toContain("secret");
  });

  it("returns null when a password is missing", () => {
    expect(parseDemoLogin("DEMO_USER=ada")).toBeNull();
  });
});
