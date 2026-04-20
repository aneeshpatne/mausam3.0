import { q } from "./orchestrator";

const ACTIVE_START_HOUR = 7;
const ACTIVE_END_HOUR = 23;
const JOB_NAME = "delayed_job";

export function isWithinActiveHours(delay: number, now = new Date()) {
  const targetTime = new Date(now.getTime() + delay);
  const hour = targetTime.getHours();

  return hour >= ACTIVE_START_HOUR && hour < ACTIVE_END_HOUR;
}

export async function scheduleJob(delay: number) {
  if (!isWithinActiveHours(delay)) {
    return false;
  }

  await q.add(
    JOB_NAME,
    {},
    {
      delay,
      jobId: `${JOB_NAME}-${Date.now()}`,
      removeOnComplete: 10,
      removeOnFail: 50,
    },
  );

  return true;
}
