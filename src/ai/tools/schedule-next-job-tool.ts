import { tool } from "langchain";
import * as z from "zod";
import { scheduleJob } from "../../bull/scheduleJobs";

const scheduleNextJobDescription =
  "Schedule Next Job by providing a delay in milliseconds, if the target execution time falls within active hours.";

const scheduleNextJobSchema = z.object({
  delay_ms: z
    .number()
    .int()
    .positive()
    .describe("Delay before execution in milliseconds"),
});

export const scheduleNextJobTool = tool(
  async ({ delay_ms }) => {
    const scheduled = await scheduleJob(delay_ms);

    if (!scheduled) {
      return "Delayed job not scheduled because the target time is outside active hours.";
    }

    return `Delayed job scheduled for ${delay_ms} milliseconds from now.`;
  },
  {
    name: "schedule_next_job",
    description: scheduleNextJobDescription,
    schema: scheduleNextJobSchema,
  },
);
