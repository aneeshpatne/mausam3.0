import { source } from "./source";

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

export async function getLocalWeatherSummary(): Promise<string> {
  try {
    const res = await fetch(source);
    if (!res.ok) {
      throw new Error(`Local weather fetch failed with status ${res.status}`);
    }

    const data = (await res.json()) as WeatherPayload;
    return `Local Station status: Temperature: ${data.temp_c}, Humidity: ${data.humidity_pct}, Pressure: ${data.pressure_hpa}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return `Local Station status unavailable: ${message}`;
  }
}
