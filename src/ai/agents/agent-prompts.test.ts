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
      "current radar over Borivali and measured Borivali observations",
    );
    expect(prompt).toContain("zero, missing, or stale values");
    expect(prompt).toContain(
      "When a source has previous and latest frames, they appear in that order",
    );
    expect(prompt).toContain("agreement or disagreement materially changes");
    expect(prompt).toContain("must not override current or next-6-hour evidence");
    expect(prompt).toContain("user's Borivali commute");
    expect(prompt).toContain("Never schedule a next-day run");
    expect(prompt).toContain("token-minimal Mumbai/MMR-wide radar memory");
    expect(prompt).toContain("now to +1 hour, +1 to +3 hours, and +3 to +6 hours");
    expect(prompt).toContain(
      "A single current radar frame supports position and intensity, not motion",
    );
    expect(prompt).toContain(
      "Do not use the highest severity elsewhere in Mumbai/MMR",
    );
    expect(prompt).toContain(
      "Personal notifications and scheduling use this color",
    );
    expect(prompt).toContain(
      "Cover 0-1h, 1-3h, and 3-6h with intensity, likelihood, confidence",
    );
    expect(prompt).toContain("return two distinct assessments");
    expect(prompt).toContain("mumbai_prediction_summary");
    expect(prompt).toContain("Only this regional prediction memory is persisted");
    expect(prompt).toContain(
      "alert_banner: plain language, no more than 7 words, explicitly identifying Borivali",
    );
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
