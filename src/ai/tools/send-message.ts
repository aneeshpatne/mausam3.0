import { tool } from "langchain";
import * as z from "zod";
import { sendTelegramRpc } from "../../grpc/client";
export const send_message = tool(
  ({ message }) => {
    sendTelegramRpc({ html: message });
  },
  {
    name: "send_message",
    description:
      "Prepare one concise user-facing telegram message. Use current-time context only to describe future conditions in explicit, future-facing time phrasing whenever the imagery supports it, without explicitly repeating the current time unless needed.",
    schema: z.object({
      message: z
        .string()
        .describe(
          "Telegram message with HTML parsing support. Do not explicitly mention the current local time unless essential. Use explicit future-facing timing whenever the imagery supports it, preferring a specific future time or a narrow future window such as by around 1:00, between 1:00 and 3:00, this evening, or for the rest of the day, instead of vague phrasing like later or soon. Use AM/PM only when it makes the timing clearer, and include a short explanation of why rain or dry weather is expected.",
        ),
    }),
  },
);
