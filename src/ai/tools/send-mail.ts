import * as z from "zod";
import { tool } from "langchain";
import { sendEmailRpc } from "../../grpc/client";
import { mailids } from "./mail_ids";

const alertColorSchema = z.enum(["green", "yellow", "orange", "red"]);

export const send_mail = tool(
  ({ alert_color, subject, mail_content }) => {
    console.log({ alert_color, subject, mail_content });
    sendEmailRpc({
      app_id: "MAUSAM",
      to: mailids,
      subject: subject,
      body: mail_content,
    });
    return "Mail prepared successfully";
  },
  {
    name: "send_mail",
    description:
      "Prepare one concise user-facing weather mail after saving the internal summary. Use current-time context only to describe future conditions in AM/PM phrasing, without explicitly repeating the current time unless needed.",
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
          "Plain-language email body without radar jargon. Do not explicitly mention the current local time unless essential. Use it only to frame a future-facing forecast in easy words, for example what may happen by 1:00 PM, later this afternoon, this evening, or for the rest of the day. Include a short simple explanation of why rain or dry weather is expected, and mention uncertainty in everyday language.",
        ),
    }),
  },
);
