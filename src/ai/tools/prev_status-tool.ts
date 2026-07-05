import { tool } from "langchain";
import * as z from "zod";

const alertStateSchema = z.enum(["green", "yellow", "orange", "red"]);
const PREV_STATUS_REDIS_KEY = "latest_prev_status";

export const saveStatus = tool(
  async ({ alert, echo, predictions }) => {
    await Bun.redis.set(
      PREV_STATUS_REDIS_KEY,
      JSON.stringify({ alert, echo, predictions }),
    );

    return "ok";
  },
  {
    name: "save-current-status",
    description:
      'Store the previous weather state for later LLM comparison. Output is machine-only: compress aggressively, prefer fragments over sentences, omit filler/articles, and optimize for minimum tokens rather than human readability. Example target shape: {"alert":"yellow","echo":"mod stratiform W/SW; offshore max; widespread light-mod rain","predictions":"rain persists 3-6h; localized ponding; no major escalation"}.',
    schema: z.object({
      alert: alertStateSchema.describe(
        "Previous alert state. Must be exactly one of: green, yellow, orange, red.",
      ),
      echo: z
        .string()
        .trim()
        .min(1)
        .describe(
          "Aggressively compressed machine summary of radar echoes only. Use minimal fragments, abbreviations, short directional/intensity tokens, no full sentences, no prose. Example: mod stratiform W/SW; offshore max; widespread light-mod rain",
        ),
      predictions: z
        .string()
        .trim()
        .min(1)
        .describe(
          "Aggressively compressed machine summary of prior forecast/risk expectations. Use minimal risk/timing tokens, abbreviations, no filler, and no human-facing explanation. Example: rain persists 3-6h; localized ponding; no major escalation",
        ),
    }),
  },
);
