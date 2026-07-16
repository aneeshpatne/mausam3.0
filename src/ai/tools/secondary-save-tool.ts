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
      'Store token-minimal LLM-only forecast memory for later comparison and primary-agent context. Use grug-style fragments while preserving material D1-D5 facts. Example: {"alert":"yellow","summary":"D1 Jul9 PM mod MMR; G=E; conf hi | D2 light sct; G<E; conf med | D3 E>G wet; conf lo | D4-5 ease"}.',
    schema: z.object({
      alert: alertStateSchema.describe(
        "Peak alert state across the supplied forecast window: green, yellow, orange, or red.",
      ),
      summary: z
        .string()
        .trim()
        .min(1)
        .describe(
          "Token-minimal LLM-only Mumbai MMR D1-D5 memory. Grug-style fragments only: abbreviations, symbols, semicolons, no prose/filler/articles. Preserve material date/IST window, rain intensity/coverage/peak, G/E signal and agreement, confidence, alert, synoptic/MSLP, wind, and trend. Omit only absent, unchanged, or low-value fields.",
        ),
    }),
  },
);
