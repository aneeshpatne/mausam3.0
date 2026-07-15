import { Worker } from "bullmq";
import { getRequiredUrl, validateRuntimeConfig } from "../config";
import {
  closeDiscordWebhookClient,
  closeMailerClient,
} from "../grpc/client";
import { client as s3Client } from "../storage/s3/client/s3";
import { runPipeline } from "../pipeline";
import { runSecondaryPipeline } from "../secondaryPipeline";
import {
  DAILY_JOB_NAME,
  DELAYED_JOB_NAME,
  q,
  QUEUE_NAME,
  redisConnection,
  SECONDARY_DAILY_JOB_NAME,
  STARTUP_JOB_NAME,
  UPTIME_KUMA_JOB_NAME,
} from "./queue";
import { scheduleJob, scheduleSecondaryJob } from "./scheduleJobs";

const DAILY_JOB_CRON = "15 7 * * *";
const SECONDARY_DAILY_JOB_CRON = "0 7 * * *";
const UPTIME_KUMA_JOB_CRON = "* * * * *";
const DAILY_JOB_TIMEZONE = "Asia/Kolkata";
const FAILURE_RETRY_DELAY_MS = 30 * 60 * 1000;

async function pushUptimeKuma(url: string): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`Uptime Kuma push failed with HTTP ${response.status}.`);
  }
}

async function configureJobs(): Promise<void> {
  await q.obliterate({ force: true });
  console.log(`[orchestrator] Queue ${QUEUE_NAME} obliterated on startup.`);

  await q.upsertJobScheduler(
    "daily-weather-pipeline-scheduler",
    { pattern: DAILY_JOB_CRON, tz: DAILY_JOB_TIMEZONE },
    { name: DAILY_JOB_NAME, data: {}, opts: { removeOnComplete: 10, removeOnFail: 50 } },
  );
  await q.upsertJobScheduler(
    "daily-secondary-pipeline-scheduler",
    { pattern: SECONDARY_DAILY_JOB_CRON, tz: DAILY_JOB_TIMEZONE },
    {
      name: SECONDARY_DAILY_JOB_NAME,
      data: {},
      opts: { removeOnComplete: 10, removeOnFail: 50 },
    },
  );
  await q.upsertJobScheduler(
    "uptime-kuma-ping-every-minute",
    { pattern: UPTIME_KUMA_JOB_CRON },
    { name: UPTIME_KUMA_JOB_NAME, data: {}, opts: { removeOnComplete: 10, removeOnFail: 50 } },
  );

  await q.add(STARTUP_JOB_NAME, {}, {
    jobId: `${STARTUP_JOB_NAME}-${Date.now()}`,
    removeOnComplete: 10,
    removeOnFail: 50,
  });
  console.log(`[orchestrator] Enqueued ${STARTUP_JOB_NAME} for immediate execution.`);
}

export async function startOrchestrator(): Promise<void> {
  validateRuntimeConfig();
  await configureJobs();

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      switch (job.name) {
        case UPTIME_KUMA_JOB_NAME:
          await pushUptimeKuma(getRequiredUrl("UPTIME_KUMA_PUSH_URL"));
          return;
        case SECONDARY_DAILY_JOB_NAME:
          await runSecondaryPipeline();
          return;
        case DAILY_JOB_NAME:
        case STARTUP_JOB_NAME:
        case DELAYED_JOB_NAME:
          await runPipeline();
          try {
            await pushUptimeKuma(getRequiredUrl("AI_JOB_PUSH_URL"));
          } catch (error) {
            console.error("[orchestrator] Failed to send AI job ping.", error);
          }
          return;
        default:
          throw new Error(`Unsupported weather queue job: ${job.name}`);
      }
    },
    { connection: redisConnection },
  );

  worker.on("completed", (job) => {
    console.log(`[orchestrator] Job ${job.id} completed.`);
  });
  worker.on("failed", async (job, error) => {
    console.error(`[orchestrator] Job ${job?.id ?? "unknown"} failed.`, error);
    if (job?.name === SECONDARY_DAILY_JOB_NAME) {
      try {
        await scheduleSecondaryJob(FAILURE_RETRY_DELAY_MS);
      } catch (scheduleError) {
        console.error("[orchestrator] Failed to schedule secondary retry.", scheduleError);
      }
    } else if (
      job?.name === DAILY_JOB_NAME ||
      job?.name === STARTUP_JOB_NAME ||
      job?.name === DELAYED_JOB_NAME
    ) {
      try {
        await scheduleJob(FAILURE_RETRY_DELAY_MS);
      } catch (scheduleError) {
        console.error("[orchestrator] Failed to schedule retry.", scheduleError);
      }
    }
  });

  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    await worker.close();
    await q.close();
    closeMailerClient();
    closeDiscordWebhookClient();
    s3Client.destroy();
    Bun.redis.close();
  };
  process.once("SIGTERM", () => void close());
  process.once("SIGINT", () => void close());
}

if (import.meta.main) {
  try {
    await startOrchestrator();
  } catch (error) {
    console.error("[orchestrator] Failed to initialize.", error);
    await q.close();
    process.exitCode = 1;
  }
}
