import { Queue, Worker } from "bullmq";
import { runPipeline } from "../pipeline";
import { runSecondaryPipeline } from "../secondaryPipeline";
import { scheduleJob } from "./scheduleJobs";

const connection = {
  host: "127.0.0.1",
  port: 6379,
};

const QUEUE_NAME = "weather_queue";
const DAILY_JOB_NAME = "daily-weather-pipeline";
const STARTUP_JOB_NAME = "startup-weather-pipeline";
const DAILY_JOB_CRON = "15 7 * * *";
const DAILY_JOB_TIMEZONE = "Asia/Kolkata";
const SECONDARY_DAILY_JOB_NAME = "daily-secondary-pipeline";
const SECONDARY_DAILY_JOB_CRON = "0 7 * * *";
const UPTIME_KUMA_JOB_NAME = "uptime-kuma-ping";
const UPTIME_KUMA_SCHEDULER_ID = "uptime-kuma-ping-every-minute";
const UPTIME_KUMA_JOB_CRON = "* * * * *";
const UPTIME_KUMA_PUSH_URL =
  "http://192.168.0.112:3001/api/push/NYoIi9edM7?status=up&msg=OK&ping=";
const AI_JOB_PUSH_URL =
  "http://192.168.0.112:3001/api/push/RRfKWyAHf0?status=up&msg=OK&ping=";
const FAILURE_RETRY_DELAY_MS = 30 * 60 * 1000;

export const q = new Queue(QUEUE_NAME, { connection });

async function pushUptimeKuma(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Uptime Kuma push failed with HTTP ${response.status}.`);
  }
}

try {
  await q.obliterate({ force: true });
  console.log(`[orchestrator] Queue ${QUEUE_NAME} obliterated on startup.`);

  // await q.add(
  //   STARTUP_JOB_NAME,
  //   {},
  //   {
  //     jobId: `${STARTUP_JOB_NAME}-${Date.now()}`,
  //     removeOnComplete: 10,
  //     removeOnFail: 50,
  //   },
  // );
  // console.log(
  //   `[orchestrator] Enqueued ${STARTUP_JOB_NAME} for immediate execution.`,
  // );

  await q.add(
    DAILY_JOB_NAME,
    {},
    {
      jobId: DAILY_JOB_NAME,
      repeat: {
        pattern: DAILY_JOB_CRON,
        tz: DAILY_JOB_TIMEZONE,
      },
      removeOnComplete: 10,
      removeOnFail: 50,
    },
  );

  console.log(
    `[orchestrator] Scheduled ${DAILY_JOB_NAME} for ${DAILY_JOB_CRON} (${DAILY_JOB_TIMEZONE}).`,
  );

  await q.add(
    SECONDARY_DAILY_JOB_NAME,
    {},
    {
      jobId: SECONDARY_DAILY_JOB_NAME,
      repeat: {
        pattern: SECONDARY_DAILY_JOB_CRON,
        tz: DAILY_JOB_TIMEZONE,
      },
      removeOnComplete: 10,
      removeOnFail: 50,
    },
  );

  console.log(
    `[orchestrator] Scheduled ${SECONDARY_DAILY_JOB_NAME} for ${SECONDARY_DAILY_JOB_CRON} (${DAILY_JOB_TIMEZONE}).`,
  );

  await q.upsertJobScheduler(
    UPTIME_KUMA_SCHEDULER_ID,
    { pattern: UPTIME_KUMA_JOB_CRON },
    {
      name: UPTIME_KUMA_JOB_NAME,
      data: {},
      opts: {
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    },
  );

  console.log(
    `[orchestrator] Upserted ${UPTIME_KUMA_JOB_NAME} for ${UPTIME_KUMA_JOB_CRON}.`,
  );

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === UPTIME_KUMA_JOB_NAME) {
        await pushUptimeKuma(UPTIME_KUMA_PUSH_URL);
        console.log(`[orchestrator] Uptime Kuma ping sent for job ${job.id}.`);
        return;
      }

      if (job.name === SECONDARY_DAILY_JOB_NAME) {
        await runSecondaryPipeline();
        console.log(
          `[orchestrator] Secondary pipeline executed for job ${job.id}.`,
        );
        return;
      }

      await runPipeline();
      console.log(
        `[orchestrator] Pipeline executed successfully for job ${job.id}.`,
      );

      try {
        await pushUptimeKuma(AI_JOB_PUSH_URL);
        console.log(`[orchestrator] AI job ping sent for job ${job.id}.`);
      } catch (pushErr) {
        console.error(
          `[orchestrator] Failed to send AI job ping for job ${job.id}.`,
          pushErr,
        );
      }
    },
    { connection },
  );

  worker.on("completed", (job) => {
    console.log(`[orchestrator] Job ${job.id} completed.`);
  });

  worker.on("failed", async (job, err) => {
    console.error(`[orchestrator] Job ${job?.id ?? "unknown"} failed.`, err);

    if (job?.name === UPTIME_KUMA_JOB_NAME) {
      return;
    }

    if (job?.name === SECONDARY_DAILY_JOB_NAME) {
      return;
    }

    try {
      await scheduleJob(FAILURE_RETRY_DELAY_MS);
    } catch (scheduleErr) {
      console.error(
        "[orchestrator] Failed to schedule retry after job failure.",
        scheduleErr,
      );
    }
  });
} catch (err) {
  console.error("[orchestrator] Failed to initialize pipeline jobs.", err);
  process.exitCode = 1;
}
