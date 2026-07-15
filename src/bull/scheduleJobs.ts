import { DELAYED_JOB_NAME, q, SECONDARY_DAILY_JOB_NAME } from "./queue";
import { isWithinActiveHours } from "./active-hours";

export async function scheduleJob(delay: number) {
  if (!isWithinActiveHours(delay)) {
    console.log("[scheduleJob] Skipping delayed job outside active hours.", {
      delay,
      activeHours: "07:00-23:00",
    });
    return false;
  }

  const targetMinute = Math.floor((Date.now() + delay) / 60_000);
  await q.add(
    DELAYED_JOB_NAME,
    {},
    {
      delay,
      jobId: `${DELAYED_JOB_NAME}-${targetMinute}`,
      removeOnComplete: 10,
      removeOnFail: 50,
    },
  );

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
