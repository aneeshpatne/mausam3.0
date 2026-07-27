import { DELAYED_JOB_NAME, q, SECONDARY_DAILY_JOB_NAME } from "./queue";
import { isWithinActiveHours } from "./active-hours";

const PRIMARY_DELAYED_DEDUPLICATION_ID = "primary-delayed-follow-up";

export async function scheduleJob(delay: number) {
  if (!isWithinActiveHours(delay)) {
    console.log("[scheduleJob] Skipping delayed job outside active hours.", {
      delay,
      activeHours: "07:00-23:00",
    });
    return false;
  }

  const targetMinute = Math.floor((Date.now() + delay) / 60_000);
  const jobId = `${DELAYED_JOB_NAME}-${targetMinute}`;
  const job = await q.add(
    DELAYED_JOB_NAME,
    {},
    {
      delay,
      jobId,
      deduplication: {
        id: PRIMARY_DELAYED_DEDUPLICATION_ID,
        keepLastIfActive: true,
      },
      removeOnComplete: 10,
      removeOnFail: 50,
    },
  );

  if (job.id !== jobId) {
    console.log("[scheduleJob] Coalesced delayed job request.", {
      requestedDelay: delay,
      existingJobId: job.id,
    });
    return true;
  }

  console.log("[scheduleJob] Scheduled delayed job.", {
    delay,
    jobName: DELAYED_JOB_NAME,
  });

  return true;
}

export async function scheduleSecondaryJob(delay: number): Promise<boolean> {
  if (!isWithinActiveHours(delay)) return false;
  const targetMinute = Math.floor((Date.now() + delay) / 60_000);
  await q.add(SECONDARY_DAILY_JOB_NAME, {}, {
    delay,
    jobId: `${SECONDARY_DAILY_JOB_NAME}-retry-${targetMinute}`,
    removeOnComplete: 10,
    removeOnFail: 50,
  });
  return true;
}
