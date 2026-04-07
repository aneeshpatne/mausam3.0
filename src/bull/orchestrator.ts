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
  console.log(`Obliterated queue ${QUEUE_NAME} on orchestrator startup`);

  await q.add(STARTUP_JOB_NAME, {}, {
    jobId: `${STARTUP_JOB_NAME}-${Date.now()}`,
    removeOnComplete: 10,
    removeOnFail: 50,
  });
  console.log(`Enqueued ${STARTUP_JOB_NAME} for immediate execution`);

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
    `Scheduled ${DAILY_JOB_NAME} for ${DAILY_JOB_CRON} (${DAILY_JOB_TIMEZONE})`,
  );

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      await runPipeline();
      console.log("Pipeline executed successfully");
    },
    { connection },
  );

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });
} catch (err) {
  console.error("Failed to initialize pipeline jobs:", err);
  process.exitCode = 1;
}
