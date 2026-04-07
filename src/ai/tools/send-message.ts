import { tool } from "langchain";
import * as z from "zod";
import { sendTelegramRpc } from "../../grpc/client";

const alertColorSchema = z.enum(["green", "yellow", "orange", "red"]);
const sendMessageDescription =
  "Prepare one user-facing Telegram message with alert color and weather emojis. Keep it clear, a little more detailed than a one-liner, and future-facing.";
const sendMessageSchema = z.object({
  alert_color: alertColorSchema.describe(
    "Severity color for Telegram header: green, yellow, orange, or red",
  ),
  message: z
    .string()
    .trim()
    .max(900)
    .describe(
      "Telegram message body with HTML parsing support. Write 3-6 short lines, include weather-appropriate emojis, and keep the update readable. Do not explicitly mention the current local time unless essential. Use explicit future-facing timing whenever the imagery supports it, preferring a specific future time or a narrow future window such as by around 1:00, between 1:00 and 3:00, this evening, or for the rest of the day, instead of vague phrasing like later or soon. Use AM/PM only when it makes the timing clearer, and include a short explanation of why rain or dry weather is expected.",
    ),
});

const telegramAlertHeader: Record<z.infer<typeof alertColorSchema>, string> = {
  green: "🟢 <b>GREEN ALERT</b>",
  yellow: "🟡 <b>YELLOW ALERT</b>",
  orange: "🟠 <b>ORANGE ALERT</b>",
  red: "🔴 <b>RED ALERT</b>",
};

export function createSendMessageTool() {
  return tool(
    async ({ message, alert_color }) => {
      const header = telegramAlertHeader[alert_color];
      const formattedMessage = `${header}\n${message}`;
      await sendTelegramRpc({ html: formattedMessage });
      return "Telegram message sent successfully";
    },
    {
      name: "send_message",
      description: sendMessageDescription,
      schema: sendMessageSchema,
    },
  );
}
