import type {
  ModelContext,
  ModelContextRegisterToolOptions,
  ModelContextTool,
} from "@mcp-b/webmcp-types";
import type { SiteData } from "./site-data";

const LOCATION = "Mumbai Metropolitan Region";
const ADVISORY = "AI guidance; follow IMD and local authorities.";
const EMPTY_INPUT_SCHEMA = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

export const WEATHER_WEBMCP_TOOL_NAMES = [
  "get_weather_nowcast",
  "get_weather_outlook",
  "get_forecast_reasoning",
] as const;

export type WeatherWebMcpToolName = (typeof WEATHER_WEBMCP_TOOL_NAMES)[number];
export type WeatherWebMcpTool = ModelContextTool<
  Record<string, never>,
  unknown,
  WeatherWebMcpToolName
> & { inputSchema: typeof EMPTY_INPUT_SCHEMA };

const unavailable = (generatedAt: string, reason: string) => ({
  available: false as const,
  generatedAt,
  reason,
});

export const quantitativeChance = (chance: number | null, rainfall: string) =>
  chance !== null && !/^qualitative\b/i.test(rainfall) ? chance : null;

export function createWeatherWebMcpTools(data: SiteData): WeatherWebMcpTool[] {
  return [
    {
      name: "get_weather_nowcast",
      title: "Get Mumbai weather nowcast",
      description:
        "Return the latest Mumbai Metropolitan Region nowcast, near-term rain risk, ground conditions, confidence, station details, and evidence summary.",
      inputSchema: EMPTY_INPUT_SCHEMA,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => {
        const primary = data.primary;
        if (!primary) {
          return unavailable(data.generatedAt, "The current nowcast has not been generated yet.");
        }

        return {
          available: true as const,
          location: LOCATION,
          scope: "Next 3–6 hours",
          analysedAt: primary.analysedAt,
          alert: primary.alert,
          headline: primary.headline,
          summary: primary.summary,
          rainChance: primary.rainChance,
          expectedPeak: primary.expectedPeak,
          confidence: primary.confidence,
          agentNote: primary.agentNote,
          conditions: {
            temperatureC: primary.temperatureC,
            feelsLikeC: primary.feelsLikeC,
            wind: primary.wind,
            rainRate: primary.rainRate,
            station: primary.station,
            stationUpdatedAt: primary.stationUpdatedAt,
          },
          evidenceSummary: primary.sourceSummary,
          advisory: ADVISORY,
        };
      },
    },
    {
      name: "get_weather_outlook",
      title: "Get Mumbai five-day outlook",
      description:
        "Return the latest five-day Mumbai Metropolitan Region forecast, including each period's conditions, rain chance when quantitative, rainfall signal, and alert level.",
      inputSchema: EMPTY_INPUT_SCHEMA,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => {
        const outlook = data.outlook;
        if (!outlook) {
          return unavailable(data.generatedAt, "The five-day outlook has not been generated yet.");
        }

        return {
          available: true as const,
          location: LOCATION,
          analysedAt: outlook.analysedAt,
          alert: outlook.alert,
          headline: outlook.headline,
          days: outlook.days.map((day) => ({
            date: day.date,
            label: day.label,
            rain: day.rain,
            chance: quantitativeChance(day.chance, day.rainfall),
            rainfall: day.rainfall,
            alert: day.alert,
          })),
          advisory: ADVISORY,
        };
      },
    },
    {
      name: "get_forecast_reasoning",
      title: "Get forecast reasoning",
      description:
        "Return the model comparison and detailed reasoning behind the latest five-day Mumbai Metropolitan Region outlook.",
      inputSchema: EMPTY_INPUT_SCHEMA,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => {
        const outlook = data.outlook;
        if (!outlook) {
          return unavailable(data.generatedAt, "Forecast reasoning is unavailable until the outlook is generated.");
        }

        return {
          available: true as const,
          location: LOCATION,
          analysedAt: outlook.analysedAt,
          alert: outlook.alert,
          headline: outlook.headline,
          modelRead: outlook.modelRead,
          reasoning: outlook.reasoning,
          advisory: ADVISORY,
        };
      },
    },
  ];
}

export function registerWeatherWebMcpTools(modelContext: ModelContext, data: SiteData) {
  const controller = new AbortController();
  const options: ModelContextRegisterToolOptions = { signal: controller.signal };
  const registerTool = modelContext.registerTool.bind(modelContext) as (
    tool: WeatherWebMcpTool,
    options?: ModelContextRegisterToolOptions,
  ) => Promise<void>;
  const registration = Promise.all(
    createWeatherWebMcpTools(data).map((tool) => registerTool(tool, options)),
  );

  return {
    registration,
    unregister: () => controller.abort(),
    signal: controller.signal,
  };
}
