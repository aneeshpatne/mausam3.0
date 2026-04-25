import * as z from "zod";
import { tool } from "langchain";
import { sendEmailRpc } from "../../grpc/client";
import { mailids } from "./mail_ids";

const alertColorSchema = z.enum(["green", "yellow", "orange", "red"]);
const sendMailDescription =
  "Prepare one concise user-facing weather mail after saving the internal summary. The content is wrapped in an HTML email template with alert color header and a Powered by Mausam3.0 footer. The email must explicitly mention the next-update decision: roughly when the next report is planned if schedule_next_job was used, or why no next run was scheduled if it was skipped.";
const sendMailSchema = z.object({
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
      "Weather email body. It may be mildly technical when useful and may use HTML-supported tags for structure or emphasis. Do not explicitly mention the current local time unless essential. Use it only to frame a future-facing forecast. Be explicit about future timing whenever the imagery supports it, preferring a specific future time or a narrow future window such as by around 1:00, between 1:00 and 3:00, this evening, or for the rest of the day, instead of vague phrases like later or soon. Use AM/PM only when it makes the timing clearer. Include a short explanation of why rain or dry weather is expected. The email must explicitly mention the next-update decision: if a next run was scheduled, say roughly when the next report is planned; if not, say why it is being skipped.",
    ),
});

const alertHex: Record<z.infer<typeof alertColorSchema>, string> = {
  green: "#1B8A3E",
  yellow: "#B7791F",
  orange: "#C05621",
  red: "#C53030",
};

function normalizeMailContent(mailContent: string): string {
  const hasHtmlTag = /<\/?[a-z][\s\S]*>/i.test(mailContent);
  if (hasHtmlTag) {
    return mailContent;
  }

  return mailContent
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("<br />");
}

function buildMailTemplate(
  subject: string,
  alertColor: z.infer<typeof alertColorSchema>,
  mailContent: string,
): string {
  const severityLabel = alertColor.toUpperCase();
  const severityHex = alertHex[alertColor];
  const normalizedContent = normalizeMailContent(mailContent);

  return `<!doctype html>
<html>
  <body style="margin:0; padding:0; background:#f4f6f8;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f6f8; margin:0; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:640px; max-width:640px; background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
            <tr>
              <td style="padding:16px 20px; background:${severityHex}; color:#ffffff; font-family:Arial, Helvetica, sans-serif; font-size:13px; font-weight:700; letter-spacing:0.4px;">
                MAUSAM WEATHER ALERT • ${severityLabel}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 20px 8px 20px; font-family:Arial, Helvetica, sans-serif; color:#111827;">
                <div style="font-size:20px; line-height:28px; font-weight:700;">${subject}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 20px 20px 20px; font-family:Arial, Helvetica, sans-serif; color:#1f2937; font-size:15px; line-height:24px;">
                ${normalizedContent}
              </td>
            </tr>
            <tr>
              <td style="padding:14px 20px; border-top:1px solid #e5e7eb; font-family:Arial, Helvetica, sans-serif; color:#6b7280; font-size:12px; line-height:18px;">
                Powered by <b>Mausam3.0</b>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export const sendMailTool = tool(
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
    description: sendMailDescription,
    schema: sendMailSchema,
  },
);
