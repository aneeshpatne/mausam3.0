import * as z from "zod";
import { tool } from "langchain";

export const save_summary_tool = tool(
  ({ summary }) => {
    console.log(summary);
    return "Summary saved successfully";
  },
  {
    name: "save_summary_tool",
    description:
      "Save the internal structured weather summary. Call this exactly once before any outward-facing tool.",
    schema: z.object({
      summary: z
        .string()
        .trim()
        .min(1)
        .describe(
          "Markdown summary based only on the provided images. Include sections for Overview, Mumbai (MMR), Borivali, Evidence, and Confidence.",
        ),
    }),
  },
);
