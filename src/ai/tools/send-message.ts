import { tool } from "langchain";
import * as z from "zod";
import { sendDiscordTextRpc } from "../../grpc/client";

const alertColorSchema = z.enum(["green", "yellow", "orange", "red"]);
const discordChannelName = process.env.DISCORD_CHANNEL_NAME ?? "weather";
const sendMessageDescription =
  "Send the single user-facing Discord weather update using the selected severity.";
const sendMessageSchema = z.object({
  alert_color: alertColorSchema.describe(
    "Severity color for Discord header: green, yellow, orange, or red",
  ),
  message: z
    .string()
    .trim()
    .max(900)
    .describe(
      "Readable Markdown, 8-14 short lines when useful, no emojis. Be future-facing and more technical than email. Prefer supported exact/narrow timing over later/soon; mention current time only if essential. Name evidence-supported Mumbai/MMR localities; use vague directional areas only after named places. Briefly explain the rain/dry signal.",
    ),
});

const discordAlertHeader: Record<z.infer<typeof alertColorSchema>, string> = {
  green: "🟢 **GREEN ALERT**",
  yellow: "🟡 **YELLOW ALERT**",
  orange: "🟠 **ORANGE ALERT**",
  red: "🔴 **RED ALERT**",
};

export const sendMessageTool = tool(
  async ({ message, alert_color }) => {
    const header = discordAlertHeader[alert_color];
    const formattedMessage = `${header}\n${message}`;
    const response = await sendDiscordTextRpc({
      channel_name: discordChannelName,
      content: formattedMessage,
    });

    if (!response.success) {
      throw new Error(response.error ?? "Discord message failed");
    }

    return "Discord message sent successfully";
  },
  {
    name: "send_message",
    description: sendMessageDescription,
    schema: sendMessageSchema,
  },
);
