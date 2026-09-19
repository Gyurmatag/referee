import { describe, expect, it } from "vitest";
import {
  clampPoint,
  loginWallFromCounts,
  mapClickToViewport,
  parseTakeoverCommand,
  parseTakeoverStatus,
  takeoverReason,
} from "./takeover.js";

describe("takeover protocol", () => {
  it("treats a password field or an OAuth button as a login wall", () => {
    expect(loginWallFromCounts(0, 0)).toBe(false);
    expect(loginWallFromCounts(1, 0)).toBe(true);
    expect(loginWallFromCounts(0, 1)).toBe(true);
    expect(takeoverReason(0, 1)).toContain("Google or GitHub");
  });

  it("parses click, type, key, and done commands", () => {
    expect(parseTakeoverCommand({ type: "click", x: 12.2, y: 40.8 })).toEqual({
      type: "click",
      x: 12,
      y: 41,
    });
    expect(parseTakeoverCommand({ type: "type", text: "ada" })).toEqual({ type: "type", text: "ada" });
    expect(parseTakeoverCommand({ type: "key", key: "Enter" })).toEqual({ type: "key", key: "Enter" });
    expect(parseTakeoverCommand({ type: "done" })).toEqual({ type: "done" });
    expect(parseTakeoverCommand({ type: "explode" })).toBeNull();
  });

  it("maps a click on the live frame back to the 1280x800 browser", () => {
    expect(mapClickToViewport(320, 200, 640, 400)).toEqual({ x: 640, y: 400 });
    expect(clampPoint(-10, 9000)).toEqual({ x: 0, y: 799 });
  });

  it("reads a waiting status from the sandbox", () => {
    const status = parseTakeoverStatus({
      state: "waiting",
      reason: "Team can take over",
      url: "https://app.example",
      signed_in: false,
      oauth: 1,
      password: 0,
      takeover: true,
    });
    expect(status?.state).toBe("waiting");
    expect(status?.takeover).toBe(true);
    expect(parseTakeoverStatus({ state: "nope" })).toBeNull();
  });
});
