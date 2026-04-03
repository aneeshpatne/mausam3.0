import { tool } from "langchain";
import * as z from "zod";

const alertColorSchema = z.enum(["green", "yellow", "orange", "red"]);

export const alert_tool = tool(
  ({ message, color }) => {
    console.log({ message, color });
    return "Alert sent successfully";
  },
  {
    name: "alert_tool",
    description:
      "Send the final user-facing alert banner. Call this exactly once after you have decided the severity.",
    schema: z.object({
      message: z
        .string()
        .trim()
        .refine(
          (value) => value.split(/\s+/).filter(Boolean).length <= 7,
          "message must be 7 words or fewer",
        )
        .describe(
          "Short alert text for the banner, 7 words or fewer, plain language only",
        ),
      color: alertColorSchema.describe(
        "Severity color based only on the images: green, yellow, orange, or red",
      ),
    }),
  },
);
