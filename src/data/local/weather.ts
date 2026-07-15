import * as z from "zod";
import { getRequiredUrl } from "../../config";

export type WeatherAlertLevel = "green" | "yellow" | "orange" | "red";

export interface WeatherPayload {
  ok: boolean;
  temp_c: number;
  pressure_hpa: number;
  humidity_pct: number;
  light_lux: number;
  alert: WeatherAlertLevel;
  ip: string;
}

const weatherPayloadSchema = z.object({
  ok: z.boolean(),
  temp_c: z.number().finite().min(-20).max(60),
  pressure_hpa: z.number().finite().min(800).max(1_200),
  humidity_pct: z.number().finite().min(0).max(100),
  light_lux: z.number().finite().nonnegative(),
  alert: z.enum(["green", "yellow", "orange", "red"]),
  ip: z.string(),
});

export async function getLocalWeatherSummary(): Promise<string> {
  try {
    const res = await fetch(getRequiredUrl("LOCAL_WEATHER_URL"), {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      throw new Error(`Local weather fetch failed with status ${res.status}`);
    }

    const data = weatherPayloadSchema.parse(await res.json());
    if (!data.ok) throw new Error("Local weather service reported failure");
    return `Local Station status: Temperature: ${data.temp_c}, Humidity: ${data.humidity_pct}, Pressure: ${data.pressure_hpa}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return `Local Station status unavailable: ${message}`;
  }
}
