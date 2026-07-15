import * as z from "zod";
import { getRequiredUrl } from "../../config";

export type WeatherAlertLevel = "green" | "yellow" | "orange" | "red";

export interface PostAlertResponse {
  ok: boolean;
  mode?: string;
}

const postAlertResponseSchema = z.object({
  ok: z.boolean(),
  mode: z.string().optional(),
}).passthrough();

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export async function postAlert(
  alert: WeatherAlertLevel,
  fetcher: Fetcher = fetch,
): Promise<PostAlertResponse> {
  const response = await fetcher(getRequiredUrl("LOCAL_ALERT_URL"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ alert }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Alert post failed with status ${response.status}`);
  }

  const result = postAlertResponseSchema.parse(await response.json());
  if (!result.ok) throw new Error("Alert service reported failure");
  return result;
}
