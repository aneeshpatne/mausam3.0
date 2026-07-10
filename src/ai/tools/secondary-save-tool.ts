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
      'Store compact LLM-only forecast memory for later comparison and weather-agent context. Call exactly once before send_mail. Preserve material forecast facts, but compress aggressively into terse labeled fragments: abbreviations, symbols, semicolons, no filler/articles/full sentences. Example: {"alert":"yellow","summary":"D1 Jul9 PM mod rain MMR; G=E; conf hi | D3 Jul11 E>G wet; conf lo | trend easing D4-5"}.',
    schema: z.object({
      alert: alertStateSchema.describe(
        "Peak alert state across the supplied forecast window: green, yellow, orange, or red.",
      ),
      summary: z
        .string()
        .trim()
        .min(1)
        .describe(
          "Token-minimal LLM memory for Mumbai MMR D1-D5. Grug-style fragments only. Keep material date/IST window, rain intensity/coverage/peak, G/E signal and agreement, confidence, alert, synoptic/MSLP, wind, trend. Omit absent/unchanged/low-value fields. Prefer compact tokens: D1, AM/PM, G=E, G>E, conf hi/med/lo, N/S/E/W, light/mod/hvy, arrows, pipes/semicolons. No prose, explanations, bullets, or repeated context.",
        ),
    }),
  },
);
