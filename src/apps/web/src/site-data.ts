import snapshot from "./generated/site-data.json";
export type Alert = "green" | "yellow" | "orange" | "red";
export interface ForecastDay { date: string; label: string; rain: string; chance: number | null; rainfall: string; alert: Alert }
export interface SiteData {
  primary: null | { alert: Alert; headline: string; summary: string; analysedAt: string; rainChance: number; expectedPeak: string; confidence: "Low" | "Medium" | "High"; agentNote: string; temperatureC: number | null; feelsLikeC: number | null; wind: string | null; rainRate: string | null; station: string | null; stationUpdatedAt: string | null; sourceSummary: string };
  outlook: null | { alert: Alert; headline: string; modelRead: string; reasoning: string; analysedAt: string; days: ForecastDay[] };
  runs: Array<{ agent: "Nowcast" | "Outlook"; analysedAt: string; note: string; alert: Alert }>;
  generatedAt: string;
}
export const siteData = snapshot as SiteData;
