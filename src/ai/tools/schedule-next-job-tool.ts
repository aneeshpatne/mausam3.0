import { tool } from "langchain";
import * as z from "zod";
import { scheduleJob } from "../../bull/scheduleJobs";

const scheduleNextJobDescription =
  "Schedule Next Job when the target execution time falls within active hours.";

const scheduleNextJobSchema = z.object({
  delay_seconds: z
    .number()
    .int()
    .positive()
    .describe("Delay before execution in seconds"),
});

export const scheduleNextJobTool = tool(
  async ({ delay_seconds }) => {
    const delayMs = delay_seconds * 1000;
    const scheduled = await scheduleJob(delayMs);

    if (!scheduled) {
      return "Delayed job not scheduled because the target time is outside active hours.";
    }

    return `Delayed job scheduled for ${delay_seconds} seconds from now.`;
  },
  {
    name: "schedule_next_job",
    description: scheduleNextJobDescription,
    schema: scheduleNextJobSchema,
  },
);
