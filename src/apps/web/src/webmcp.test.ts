import { describe, expect, test } from "bun:test";
import type { ModelContext } from "@mcp-b/webmcp-types";
import type { SiteData } from "./site-data";
import { siteData } from "./site-data";
import {
  createWeatherWebMcpTools,
  registerWeatherWebMcpTools,
  WEATHER_WEBMCP_TOOL_NAMES,
  type WeatherWebMcpTool,
} from "./webmcp";

const toolNamed = (data: SiteData, name: WeatherWebMcpTool["name"]) => {
  const tool = createWeatherWebMcpTools(data).find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`Missing tool: ${name}`);
  return tool;
};

const execute = async (data: SiteData, name: WeatherWebMcpTool["name"]) =>
  await toolNamed(data, name).execute({});

describe("Mausam WebMCP tools", () => {
  test("declare three focused, read-only tools with empty input schemas", () => {
    const tools = createWeatherWebMcpTools(siteData);

    expect(tools.map((tool) => tool.name)).toEqual([...WEATHER_WEBMCP_TOOL_NAMES]);
    for (const tool of tools) {
      expect(tool.title?.length).toBeGreaterThan(0);
      expect(tool.description.length).toBeLessThanOrEqual(500);
      expect(tool.inputSchema).toEqual({
        type: "object",
        properties: {},
        additionalProperties: false,
      });
      expect(tool.annotations).toEqual({
        readOnlyHint: true,
        untrustedContentHint: true,
      });
    }
  });

  test("projects the current nowcast without replacing missing measurements", async () => {
    const result = await execute(siteData, "get_weather_nowcast") as Record<string, unknown>;
    const conditions = result.conditions as Record<string, unknown>;

    expect(result.available).toBe(true);
    expect(result.location).toBe("Mumbai Metropolitan Region");
    expect(result.headline).toBe(siteData.primary?.headline);
    expect(result.rainChance).toBe(siteData.primary?.rainChance);
    expect(conditions.temperatureC).toBe(siteData.primary?.temperatureC);
    expect(conditions.stationUpdatedAt).toBe(siteData.primary?.stationUpdatedAt);
  });

  test("returns five forecast periods and suppresses qualitative placeholder chances", async () => {
    const result = await execute(siteData, "get_weather_outlook") as Record<string, unknown>;
    const days = result.days as Array<Record<string, unknown>>;

    expect(result.available).toBe(true);
    expect(days).toHaveLength(siteData.outlook?.days.length ?? 0);
    expect(days[0]?.chance).toBeNull();
    expect(days[0]?.rainfall).toBe(siteData.outlook?.days[0]?.rainfall);
    expect(result).not.toHaveProperty("reasoning");
    expect(result).not.toHaveProperty("modelRead");
  });

  test("keeps detailed model reasoning in its own tool", async () => {
    const result = await execute(siteData, "get_forecast_reasoning") as Record<string, unknown>;

    expect(result.available).toBe(true);
    expect(result.modelRead).toBe(siteData.outlook?.modelRead);
    expect(result.reasoning).toBe(siteData.outlook?.reasoning);
    expect(result).not.toHaveProperty("days");
  });

  test("returns structured unavailable results when snapshot sections are missing", async () => {
    const missingData: SiteData = { ...siteData, primary: null, outlook: null };

    for (const name of WEATHER_WEBMCP_TOOL_NAMES) {
      const result = await execute(missingData, name) as Record<string, unknown>;
      expect(result.available).toBe(false);
      expect(result.generatedAt).toBe(missingData.generatedAt);
      expect(typeof result.reason).toBe("string");
    }
  });

  test("returns JSON-serializable responses within the recommended character budget", async () => {
    for (const name of WEATHER_WEBMCP_TOOL_NAMES) {
      const result = await execute(siteData, name);
      expect(() => JSON.stringify(result)).not.toThrow();
      expect(JSON.stringify(result).length).toBeLessThanOrEqual(1_500);
    }
  });

  test("registers every tool with one abort signal and unregisters on cleanup", async () => {
    const calls: Array<{ tool: WeatherWebMcpTool; signal?: AbortSignal }> = [];
    const modelContext = {
      registerTool: async (tool: WeatherWebMcpTool, options?: { signal?: AbortSignal }) => {
        calls.push({ tool, signal: options?.signal });
      },
    } as unknown as ModelContext;

    const registration = registerWeatherWebMcpTools(modelContext, siteData);
    await registration.registration;

    expect(calls.map(({ tool }) => tool.name)).toEqual([...WEATHER_WEBMCP_TOOL_NAMES]);
    expect(calls.every(({ signal }) => signal === registration.signal)).toBe(true);
    expect(registration.signal.aborted).toBe(false);

    registration.unregister();
    expect(registration.signal.aborted).toBe(true);
  });
});
