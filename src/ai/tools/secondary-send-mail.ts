import * as z from "zod";
import { tool } from "langchain";
import { sendEmailRpc } from "../../grpc/client";
import { mailids } from "./mail_ids";
import { buildMailTemplate } from "./send-mail";

const alertColorSchema = z.enum(["green", "yellow", "orange", "red"]);

const sendMailSecondaryDescription =
  "Prepare one concise user-facing weather mail after saving the internal summary. The content is wrapped in an HTML email template with alert color header and a Powered by Mausam3.0 footer.";

const sendMailSecondarySchema = z.object({
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
      "Weather email body. It may be mildly technical when useful and may use HTML-supported tags for structure or emphasis. Do not explicitly mention the current local time unless essential. Use it only to frame a future-facing forecast. Be explicit about future timing whenever the imagery supports it, preferring a specific future time or a narrow future window such as by around 1:00, between 1:00 and 3:00, this evening, or for the rest of the day, instead of vague phrases like later or soon. Use AM/PM only when it makes the timing clearer. Include a short explanation of why rain or dry weather is expected.",
    ),
});

export const sendMailToolSecondary = tool(
  async ({ alert_color, subject, mail_content }) => {
    const templatedMail = buildMailTemplate(subject, alert_color, mail_content);
    console.log("[tool:send-mail] Sending weather mail.", {
      alert_color,
      subject,
    });
    await sendEmailRpc({
      app_id: "MAUSAM",
      to: mailids,
      subject: subject,
      body: templatedMail,
    });
    return "Mail sent successfully";
  },
  {
    name: "send_mail",
    description: sendMailSecondaryDescription,
    schema: sendMailSecondarySchema,
  },
);
