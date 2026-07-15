import * as z from "zod";
import { tool } from "langchain";
import { sendEmailRpc } from "../../grpc/client";
import { getMailRecipients } from "../../config";
import { buildMailTemplate } from "./send-mail";

const alertColorSchema = z.enum(["green", "yellow", "orange", "red"]);

const sendMailSecondaryDescription =
  "Prepare one formatted layman medium-range weather mail after saving the internal summary. The email should explain the next five dated forecast windows in simple language, with a clear alert, simple idea, likely affected areas when supported, confidence, verdicts, and tentative day-wise alerts when useful. The content is wrapped in an HTML email template with alert color header and a Powered by Mausam3.0 footer.";

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
      "Formatted HTML-supported medium-range weather email body in layman language. Take enough space to explain clearly, but include only relevant forecast details supported by the images. Required structure: short opening with overall alert, simple idea, and likely affected broad areas if supported; then five dated sections or list items headed by explicit calendar dates/time windows in IST, not labels like Day 1 or Day 2. For each date, include only the practical verdict, confidence, likely affected broad areas if supported, and tentative alert color when supported. Each dated forecast line must begin exactly in the pattern `Thu Jul 09 2026, 07:00 AM-11:59 PM IST - 🟡 - (Yellow) Alert: ...`, using the matching emoji for the alert color: green `🟢`, yellow `🟡`, orange `🟠`, red `🔴`. Do not explicitly mention GFS, ECMWF, model names, model agreement, model disagreement, MSLP/synoptic jargon, or model minutiae in the email; save those details for Discord. Use clean tags such as <p>, <h3>, <ul>, <li>, <b>, and <br />. Do not use vague timing like later or soon when a concrete window is available. Use AM/PM only when it makes timing clearer. Do not add unsupported neighborhood-specific claims or irrelevant filler.",
    ),
});

export const sendMailToolSecondary = tool(
  async ({ alert_color, subject, mail_content }) => {
    const templatedMail = buildMailTemplate(subject, alert_color, mail_content);
    console.log("[tool:send-mail] Sending weather mail.", {
      alert_color,
      subject,
    });
    const response = await sendEmailRpc({
      app_id: "MAUSAM",
      to: getMailRecipients(),
      subject: subject,
      body: templatedMail,
    });
    if (!response.success) {
      throw new Error("Mailer service reported email delivery failure");
    }
    return "Mail sent successfully";
  },
  {
    name: "send_mail",
    description: sendMailSecondaryDescription,
    schema: sendMailSecondarySchema,
  },
);
