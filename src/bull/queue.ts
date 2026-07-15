import { Queue } from "bullmq";

export const QUEUE_NAME = "weather_queue";
export const DAILY_JOB_NAME = "daily-weather-pipeline";
export const SECONDARY_DAILY_JOB_NAME = "daily-secondary-pipeline";
export const STARTUP_JOB_NAME = "startup-weather-pipeline";
export const DELAYED_JOB_NAME = "delayed-weather-pipeline";
export const UPTIME_KUMA_JOB_NAME = "uptime-kuma-ping";

export const redisConnection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? "6379"),
};

export const q = new Queue(QUEUE_NAME, { connection: redisConnection });
