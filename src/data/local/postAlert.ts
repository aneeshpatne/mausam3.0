import { alertSource } from "./source";

export type WeatherAlertLevel = "green" | "yellow" | "orange" | "red";

export interface PostAlertResponse {
  ok: boolean;
  mode: string;
  soundMode: string;
  alert: WeatherAlertLevel;
  sameColor: boolean;
  ip: string;
  nextBackupPollInMs: number;
}

export async function postAlert(
  alert: WeatherAlertLevel,
): Promise<PostAlertResponse> {
  const response = await fetch(alertSource, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ alert }),
  });

  if (!response.ok) {
    throw new Error(`Alert post failed with status ${response.status}`);
  }

  return (await response.json()) as PostAlertResponse;
}
