import { tool } from "langchain";
import * as z from "zod";

export const alert_tool = tool(
  ({ message, color }) => {
    console.log({ message, color });
    return "Message Sent Successfully";
  },
  {
    name: "alert_tool",
    description: "Use this tool to send Alert to the user",
    schema: z.object({
      message: z
        .string()
        .describe("The alert sent as a message, must be less that 7 words"),
      color: z
        .string()
        .describe(
          "The alert color based on severity, should be green, yellow, orange or red only",
        ),
    }),
  },
);
