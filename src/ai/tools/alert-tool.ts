import { tool } from "langchain";
import * as z from "zod";
import { postAlert } from "../../data/local/postAlert";

const alertColorSchema = z.enum(["green", "yellow", "orange", "red"]);
const alertToolDescription =
  "Send the final user-facing alert banner. Call this exactly once after you have decided the severity.";
const ALERT_REDIS_KEY = "latest_alert_banner";
const alertToolSchema = z.object({
  message: z
    .string()
    .trim()
    .refine(
      (value) => value.split(/\s+/).filter(Boolean).length <= 7,
      "message must be 7 words or fewer",
    )
    .describe(
      "Short alert text for the banner, 7 words or fewer, plain language only",
    ),
  color: alertColorSchema.describe(
    "Severity color based only on the images: green, yellow, orange, or red",
  ),
});

export const alertTool = tool(
  async ({ message, color }) => {
    const alertResponse = await postAlert(color);
    await Bun.redis.set(ALERT_REDIS_KEY, JSON.stringify({ message, color }));

    console.log("[tool:alert] Sending alert banner.", { message, color });
    return `Alert sent successfully (${alertResponse.mode}.`;
  },
  {
    name: "alert_tool",
    description: alertToolDescription,
    schema: alertToolSchema,
  },
);
