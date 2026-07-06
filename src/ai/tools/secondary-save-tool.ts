import { tool } from "langchain";
import * as z from "zod";

const alertStateSchema = z.enum(["green", "yellow", "orange", "red"]);
const SECONDARY_PREV_STATUS_REDIS_KEY = "secondary_prev_status";

export const saveSecondaryStatus = tool(
  async ({ alert, summary }) => {
    await Bun.redis.set(
      SECONDARY_PREV_STATUS_REDIS_KEY,
      JSON.stringify({ alert, summary }),
    );

    return "ok";
  },
  {
    name: "save-secondary-status",
    description:
      'Store the secondary-agent forecast state for later LLM comparison and weather-agent context. Call this exactly once before send_mail. Output is machine-readable and may be as information-rich as needed, but include only forecast-relevant details supported by the provided images. Do not optimize for minimum tokens. Example target shape: {"alert":"yellow","summary":"Jul 9 afternoon: GFS/ECMWF both show moderate rain near Mumbai MMR, higher confidence; Jul 11: ECMWF wetter than GFS, lower confidence; trend eases by Jul 12."}.',
    schema: z.object({
      alert: alertStateSchema.describe(
        "Peak alert state across the 3 frames. Must be exactly one of: green, yellow, orange, red.",
      ),
      summary: z
        .string()
        .trim()
        .min(1)
        .describe(
          "Machine-readable GFS/ECMWF medium-range outlook for Mumbai MMR. No length cap: include all relevant supported details needed for later comparison and for the primary weather agent, while excluding irrelevant filler. Cover Day 1 through Day 5 with exact IST date/time window, rainfall intensity and coverage, peak timing when visible, GFS signal, ECMWF signal, model agreement or disagreement, confidence, tentative alert color when supported, material synoptic/MSLP features, material wind signals, and overall trend. Plain structured prose, bullets, or compact labeled sections are all acceptable.",
        ),
    }),
  },
);
