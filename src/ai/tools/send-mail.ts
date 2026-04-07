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
    return "Mail sent successfully";
  },
  {
    name: "send_mail",
    description:
      "Prepare one concise user-facing weather mail after saving the internal summary. Use current-time context only to describe future conditions in explicit, future-facing time phrasing whenever the imagery supports it, without explicitly repeating the current time unless needed. HTML-supported tags may be used when they improve clarity.",
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
          "Weather email body. It may be mildly technical when useful and may use HTML-supported tags for structure or emphasis. Do not explicitly mention the current local time unless essential. Use it only to frame a future-facing forecast. Be explicit about future timing whenever the imagery supports it, preferring a specific future time or a narrow future window such as by around 1:00, between 1:00 and 3:00, this evening, or for the rest of the day, instead of vague phrasing like later or soon. Use AM/PM only when it makes the timing clearer. Include a short explanation of why rain or dry weather is expected.",
        ),
    }),
  },
);
