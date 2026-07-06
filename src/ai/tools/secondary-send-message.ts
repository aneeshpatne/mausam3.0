import { tool } from "langchain";
import * as z from "zod";
import { sendDiscordTextRpc } from "../../grpc/client";

const alertColorSchema = z.enum(["green", "yellow", "orange", "red"]);
const discordChannelName = process.env.DISCORD_CHANNEL_NAME ?? "weather";
const DISCORD_CHUNK_MAX_LENGTH = 1_700;

const discordAlertHeader: Record<z.infer<typeof alertColorSchema>, string> = {
  green: "🟢 **GREEN MEDIUM-RANGE OUTLOOK**",
  yellow: "🟡 **YELLOW MEDIUM-RANGE OUTLOOK**",
  orange: "🟠 **ORANGE MEDIUM-RANGE OUTLOOK**",
  red: "🔴 **RED MEDIUM-RANGE OUTLOOK**",
};

export function splitDiscordMessage(
  message: string,
  maxLength = DISCORD_CHUNK_MAX_LENGTH,
): string[] {
  const normalized = message.trim();
  if (normalized.length <= maxLength) {
    return normalized ? [normalized] : [];
  }

  const chunks: string[] = [];
  let current = "";

  for (const line of normalized.split("\n")) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (line.length <= maxLength) {
      current = line;
      continue;
    }

    for (let index = 0; index < line.length; index += maxLength) {
      chunks.push(line.slice(index, index + maxLength));
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

const sendSecondaryMessageDescription =
  "Send one technical medium-range Discord update after saving the secondary summary and preparing the layman email. The tool automatically splits long messages into multiple Discord-safe chunks.";

const sendSecondaryMessageSchema = z.object({
  alert_color: alertColorSchema.describe(
    "Peak medium-range severity color: green, yellow, orange, or red",
  ),
  message: z
    .string()
    .trim()
    .min(1)
    .describe(
      "Technical Discord message body with Markdown support. Include model-specific detail that is too technical for email: GFS vs ECMWF signals, MSLP/synoptic pattern, precipitation placement, wind signals, confidence, divergence, and tentative day/date alert reasoning. Use explicit dates and IST time windows. The message may be long; the tool will split it into multiple Discord messages safely.",
    ),
});

export const sendSecondaryMessageTool = tool(
  async ({ message, alert_color }) => {
    const chunks = splitDiscordMessage(message);
    if (chunks.length === 0) {
      throw new Error("Discord message cannot be empty");
    }

    const baseHeader = discordAlertHeader[alert_color];
    for (const [index, chunk] of chunks.entries()) {
      const header =
        chunks.length === 1
          ? baseHeader
          : `${baseHeader} (${index + 1}/${chunks.length})`;
      const response = await sendDiscordTextRpc({
        channel_name: discordChannelName,
        content: `${header}\n${chunk}`,
      });

      if (!response.success) {
        throw new Error(response.error ?? "Discord message failed");
      }
    }

    return `Discord message sent successfully in ${chunks.length} chunk(s)`;
  },
  {
    name: "send_message",
    description: sendSecondaryMessageDescription,
    schema: sendSecondaryMessageSchema,
  },
);
