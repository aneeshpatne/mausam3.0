import { rainDataUrl } from "./sources";

export interface RainTotals {
  last15Minutes: number | null;
  last1Hour: number | null;
  last24Hours: number | null;
}

function parseRainValue(value: string | undefined): number | null {
  if (!value || value === "NA") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function postRainData(stationId: number | string): Promise<string> {
  const body = new URLSearchParams({
    station_id: String(stationId),
  });

  const response = await fetch(rainDataUrl, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    throw new Error(`Rain data fetch failed with status ${response.status}`);
  }

  return response.text();
}

export async function getRain(stationId: number): Promise<RainTotals> {
  const rawResponse = (await postRainData(stationId)).trim();
  const [last15Minutes, last1Hour, last24Hours] = rawResponse.split("##");

  return {
    last15Minutes: parseRainValue(last15Minutes),
    last1Hour: parseRainValue(last1Hour),
    last24Hours: parseRainValue(last24Hours),
  };
}
