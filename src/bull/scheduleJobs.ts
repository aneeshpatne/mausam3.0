import { q } from "./orchestrator";

export async function scheduleJob(delay: number) {
  await q.add(
    "delayed_job",
    {},
    {
      delay: 5000,
      jobId: `${"delayed_job"}-${Date.now()}`,
      removeOnComplete: 10,
      removeOnFail: 50,
    },
  );
}
