import * as z from "zod";
import { tool } from "langchain";

export const save_summary_tool = tool(
  ({ summary }) => {
    console.log(summary);
  },
  {
    name: "save_summary_tool",
    description: "Use this tool to save the summary of your report",
    schema: z.object({
      summary: z
        .string()
        .describe("In depth summary of the your report in markdown"),
    }),
  },
);
