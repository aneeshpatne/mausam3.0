import { describe, expect, test } from "bun:test";
import { toJsonSchema } from "@langchain/core/utils/json_schema";
import { weatherDecisionSchema } from "./weather-agent";
import { MUMBAI_LOCALITY_GUIDANCE } from "./weather-locality-guidance";

function expectReferencesHaveNoSiblings(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) expectReferencesHaveNoSiblings(item);
    return;
  }
  if (!value || typeof value !== "object") return;

  const object = value as Record<string, unknown>;
  if ("$ref" in object) expect(Object.keys(object)).toEqual(["$ref"]);
  for (const child of Object.values(object)) {
    expectReferencesHaveNoSiblings(child);
  }
}

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

describe("weather agent structured output", () => {
  test("does not generate unsupported siblings beside OpenAI $refs", () => {
    const jsonSchema = toJsonSchema(weatherDecisionSchema, {
      cycles: "ref",
      reused: "ref",
      override(context) {
        context.jsonSchema.title = "weather_reporting_decision";
      },
    });

    expectReferencesHaveNoSiblings(jsonSchema);
  });
});
