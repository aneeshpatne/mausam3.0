import { describe, expect, test } from "bun:test";
import { MUMBAI_LOCALITY_GUIDANCE } from "./weather-locality-guidance";

describe("weather agent locality guidance", () => {
  test("requires named localities over vague directions", () => {
    expect(MUMBAI_LOCALITY_GUIDANCE).toContain(
      "prefer named Mumbai/MMR localities over vague directions",
    );
    expect(MUMBAI_LOCALITY_GUIDANCE).toContain(
      "Borivali is the alert target",
    );
    expect(MUMBAI_LOCALITY_GUIDANCE).toContain("best-effort locality names");
    expect(MUMBAI_LOCALITY_GUIDANCE).toContain("do not rely on a fixed example list");
    expect(MUMBAI_LOCALITY_GUIDANCE).toContain("western pockets");
    expect(MUMBAI_LOCALITY_GUIDANCE).toContain("secondary context");
    expect(MUMBAI_LOCALITY_GUIDANCE).toContain(
      "Never transfer severity from another locality to Borivali",
    );
    expect(MUMBAI_LOCALITY_GUIDANCE).toContain(
      "separate Mumbai/MMR assessment",
    );
  });
});
