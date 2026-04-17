import { Queue, Worker } from "bullmq";
import { runPipeline } from "../pipeline";

const connection = {
  host: "127.0.0.1",
  port: 6379,
};

const QUEUE_NAME = "weather_queue";
const DAILY_JOB_NAME = "daily-weather-pipeline";
const STARTUP_JOB_NAME = "startup-weather-pipeline";
const DAILY_JOB_CRON = "15 7 * * *";
const DAILY_JOB_TIMEZONE = "Asia/Kolkata";

const q = new Queue(QUEUE_NAME, { connection });

try {
  await q.obliterate({ force: true });
  console.log(`[orchestrator] Queue ${QUEUE_NAME} obliterated on startup.`);

  await q.add(STARTUP_JOB_NAME, {}, {
    jobId: `${STARTUP_JOB_NAME}-${Date.now()}`,
    removeOnComplete: 10,
    removeOnFail: 50,
  });
  console.log(
    `[orchestrator] Enqueued ${STARTUP_JOB_NAME} for immediate execution.`,
  );

  await q.add(DAILY_JOB_NAME, {}, {
    jobId: DAILY_JOB_NAME,
    repeat: {
      pattern: DAILY_JOB_CRON,
      tz: DAILY_JOB_TIMEZONE,
    },
    removeOnComplete: 10,
    removeOnFail: 50,
  });

  console.log(
    `[orchestrator] Scheduled ${DAILY_JOB_NAME} for ${DAILY_JOB_CRON} (${DAILY_JOB_TIMEZONE}).`,
  );

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      await runPipeline();
      console.log(`[orchestrator] Pipeline executed successfully for job ${job.id}.`);
    },
    { connection },
  );

  worker.on("completed", (job) => {
    console.log(`[orchestrator] Job ${job.id} completed.`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[orchestrator] Job ${job?.id ?? "unknown"} failed.`, err);
  });
} catch (err) {
  console.error("[orchestrator] Failed to initialize pipeline jobs.", err);
  process.exitCode = 1;
}
