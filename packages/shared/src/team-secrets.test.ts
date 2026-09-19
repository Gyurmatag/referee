import { describe, expect, it } from "vitest";
import {
  formatEnvFile,
  parseTeamSecrets,
  redactSecretLines,
  secretKeys,
} from "./team-secrets.js";

describe("team secrets", () => {
  it("parses dotenv lines and ignores comments", () => {
    const parsed = parseTeamSecrets(`
# keys for Devin
OPENAI_API_KEY=sk-test
export GROQ_API_KEY="gsk_1"
ELEVENLABS_API_KEY='el_1'
`);
    expect(parsed).toEqual({
      OPENAI_API_KEY: "sk-test",
      GROQ_API_KEY: "gsk_1",
      ELEVENLABS_API_KEY: "el_1",
    });
    expect(secretKeys(parsed)).toEqual(["ELEVENLABS_API_KEY", "GROQ_API_KEY", "OPENAI_API_KEY"]);
  });

  it("formats an env file and redacts values", () => {
    const file = formatEnvFile({ OPENAI_API_KEY: "sk-test", NOTE: "has space" });
    expect(file).toContain("OPENAI_API_KEY=sk-test");
    expect(file).toContain('NOTE="has space"');
    expect(redactSecretLines("OPENAI_API_KEY=sk-test\nDEMO_USER=ada")).toBe(
      "OPENAI_API_KEY=***\nDEMO_USER=ada",
    );
  });
});
