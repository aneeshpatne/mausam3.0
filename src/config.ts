import * as z from "zod";

const requiredText = z.string().trim().min(1);
const requiredUrl = z.url();

export function getRequiredEnv(name: string): string {
  const result = requiredText.safeParse(process.env[name]);
  if (!result.success) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return result.data;
}

export function getRequiredUrl(name: string): string {
  const value = getRequiredEnv(name);
  const result = requiredUrl.safeParse(value);
  if (!result.success) {
    throw new Error(`Environment variable ${name} must be a valid URL`);
  }
  return result.data;
}

export function getPublicBaseUrl(): string {
  return `${getRequiredUrl("R2_PUBLIC_BASE_URL").replace(/\/+$/, "")}/`;
}

export function getMailRecipients(): string[] {
  const recipients = getRequiredEnv("MAIL_RECIPIENTS")
    .split(",")
    .map((recipient) => recipient.trim())
    .filter(Boolean);
  const result = z.array(z.email()).min(1).safeParse(recipients);
  if (!result.success) {
    throw new Error("MAIL_RECIPIENTS must contain comma-separated email addresses");
  }
  return result.data;
}

export function validateRuntimeConfig(): void {
  for (const name of [
    "OPENAI_API_KEY",
    "ENDPOINT_URL",
    "aws_access_key_id",
    "aws_secret_access_key",
    "R2_PUBLIC_BASE_URL",
    "LOCAL_WEATHER_URL",
    "LOCAL_ALERT_URL",
    "RAIN_STATS_URL",
    "UPTIME_KUMA_PUSH_URL",
    "AI_JOB_PUSH_URL",
  ]) {
    if (name.endsWith("_URL") || name === "ENDPOINT_URL") {
      getRequiredUrl(name);
    } else {
      getRequiredEnv(name);
    }
  }
  getMailRecipients();
  const redisPort = z.coerce.number().int().positive().max(65_535).safeParse(
    process.env.REDIS_PORT ?? "6379",
  );
  if (!redisPort.success) {
    throw new Error("REDIS_PORT must be a valid TCP port");
  }
}
