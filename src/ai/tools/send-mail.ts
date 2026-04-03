import * as z from "zod";
import { tool } from "langchain";

const alertColorSchema = z.enum(["green", "yellow", "orange", "red"]);

export const send_mail = tool(
  ({ alert_color, subject, mail_content }) => {
    console.log({ alert_color, subject, mail_content });
    return "Mail prepared successfully";
  },
  {
    name: "send_mail",
    description:
      "Prepare one concise user-facing weather mail after saving the internal summary. Use current-time context and AM/PM phrasing.",
    schema: z.object({
      alert_color: alertColorSchema.describe(
        "Severity color based only on the images: green, yellow, orange, or red",
      ),
      subject: z
        .string()
        .trim()
        .min(1)
        .max(80)
        .describe("Short email subject in plain language"),
      mail_content: z
        .string()
        .trim()
        .describe(
          "Plain-language email body without radar jargon. Anchor the update to current local time, use AM/PM wording, describe how risk may change through the day (morning/afternoon/evening), and include confidence limits.",
        ),
    }),
  },
);
