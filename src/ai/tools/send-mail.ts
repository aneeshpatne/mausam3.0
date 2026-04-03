import * as z from "zod";
import { tool } from "langchain";

export const send_mail = tool(() => {}, {
  name: "send_mail",
  description: "Use this tool to send alert mail to the user",
  schema: z.object({
    alert_color: z
      .string()
      .describe(
        "The alert color based on severity, should be green, yellow, orange or red only",
      ),
    mail_content: z
      .string()
      .describe(
        "Summary of your reports without techincal details, and more for normal language",
      ),
  }),
});
