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
      'Store the previous secondary-agent forecast state for later LLM comparison. Call this exactly once before send_mail. Output is machine-only: compress aggressively, prefer fragments over sentences, omit filler/articles, and optimize for minimum tokens rather than human readability. Example target shape: {"alert":"yellow","summary":"GFS/ECMWF agree on mod rain Thu PM; divergence Sat; dry trend by Sun"}.',
    schema: z.object({
      alert: alertStateSchema.describe(
        "Peak alert state across the 3 frames. Must be exactly one of: green, yellow, orange, red.",
      ),
      summary: z
        .string()
        .trim()
        .min(1)
        .describe(
          "Ultra-dense machine summary of the GFS/ECMWF medium-range outlook. One compact block, no prose. Format: 3 semicolon-separated frame entries, each starting with the exact IST date+time window (e.g. 'Wed Jul 9 12:00-18:00 IST'), immediately followed by dense tokens covering, in this order: (1) rainfall intensity token (dry/traces/light/mod/hvy/vhvy/extreme + coverage e.g. iso/sct/widespread), (2) primary timing sub-window if sharper than the frame window (e.g. 'peak 15-18h'), (3) GFS vs ECMWF agreement tag ('m=X' matched/'m!=X' divergence with which side is wetter or drier, e.g. 'm!=ECMWF wet'), (4) MSLP/synoptic feature if present (low/trough/ridge/cyclone/monsoon-shear), (5) wind note only if material (e.g. 'SW 25g40'). Join the 3 entries with '; '. End with a trend token: 'trnd: wet->dry' or 'trnd: steady' or 'trnd: dry->wet'. Example target: 'Wed Jul 9 12:00-18:00 IST hvy widespread peak 15-18h m=ECMWF,GFS low over N Arabian Sea SW 25g40; Thu Jul 10 06:00-12:00 IST light sct m!=GFS wetter trnd: wet->dry; Fri Jul 11 18:00-00:00 IST dry m=X ridge'. No articles, no filler, no verbs.",
        ),
    }),
  },
);
