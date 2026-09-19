import { describe, expect, it } from "vitest";
import { judgesStartTogether } from "../src/judge-parallel.js";

describe("judgesStartTogether", () => {
  it("starts build and tracks together only when JUDGE_PARALLEL is true", () => {
    expect(judgesStartTogether("true")).toBe(true);
    expect(judgesStartTogether("TRUE")).toBe(true);
    expect(judgesStartTogether("false")).toBe(false);
    expect(judgesStartTogether("")).toBe(false);
    expect(judgesStartTogether(undefined)).toBe(false);
  });
});
