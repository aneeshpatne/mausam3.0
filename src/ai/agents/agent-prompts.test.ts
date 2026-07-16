import { describe, expect, test } from "bun:test";
import {
  buildPrimaryAgentPrompt,
  buildSecondaryAgentPrompt,
} from "./agent-prompts";

describe("primary agent prompt", () => {
  test("preserves the detailed evidence hierarchy and reporting requirements", () => {
    const prompt = buildPrimaryAgentPrompt({
      currentTimeText: "Thu Jul 16 2026, 08:00 AM IST",
      mode: "morning",
      prevStatus: "prior radar context",
      secondaryStatus: "D1-D5 context",
      imageOrder: ["PPI-Z radar", "SRI rainfall estimate"],
    });

    expect(prompt).toStartWith("# Identity");
    expect(prompt).toContain(
      "current radar and measured observations, then GFS/ECMWF",
    );
    expect(prompt).toContain("zero, missing, or stale values");
    expect(prompt).toContain("agreement or disagreement materially changes");
    expect(prompt).toContain("must not override current or next-6-hour evidence");
    expect(prompt).toContain("Morning mode prioritizes the commute");
    expect(prompt).toContain("Never schedule a next-day run");
    expect(prompt).toContain("token-minimal LLM-only radar memory");
    expect(prompt).toContain("grug-style timing");
    expect(prompt).toContain("<mode>morning</mode>");
    expect(prompt).toContain(
      "<image_order>PPI-Z radar | SRI rainfall estimate</image_order>",
    );
  });
});

describe("secondary agent prompt", () => {
  test("preserves complete D1-D5 analysis and channel-specific output rules", () => {
    const prompt = buildSecondaryAgentPrompt({
      currentTimeText: "Thu Jul 16 2026, 07:00 AM IST",
      prevStatus: "previous outlook",
      imageOrder: ["GFS +24h", "ECMWF +24h"],
    });

    expect(prompt).toStartWith("# Identity");
    expect(prompt).toContain("assess every window");
    expect(prompt).toContain("state which one you lean toward");
    expect(prompt).toContain("The overall alert is the peak supported risk");
    expect(prompt).toContain("token-minimal LLM-only D1-D5 memory");
    expect(prompt).toContain("grug-style labeled fragments");
    expect(prompt).toContain("one concise line per dated forecast window");
    expect(prompt).toContain("GFS versus ECMWF precipitation");
    expect(prompt).toContain(
      "<image_order>GFS +24h | ECMWF +24h</image_order>",
    );
  });
});
