import { afterEach, expect, mock, setSystemTime, test } from "bun:test";
import type { JobsOptions } from "bullmq";
import { isWithinActiveHours } from "./active-hours";

const add = mock(
  async (_name: string, _data: object, _options: JobsOptions) => ({ id: "" }),
);
mock.module("./queue", () => ({
  DELAYED_JOB_NAME: "delayed-weather-pipeline",
  SECONDARY_DAILY_JOB_NAME: "daily-secondary-pipeline",
  q: { add },
}));
const { scheduleJob } = await import("./scheduleJobs");

afterEach(() => {
  setSystemTime();
  add.mockReset();
});

test("evaluates active hours in Mumbai and rejects next-day targets", () => {
  const sevenAmIst = new Date("2026-07-14T01:30:00.000Z");
  expect(isWithinActiveHours(15 * 60 * 60 * 1000, sevenAmIst)).toBe(true);
  expect(isWithinActiveHours(16 * 60 * 60 * 1000, sevenAmIst)).toBe(false);
  expect(isWithinActiveHours(18 * 60 * 60 * 1000, sevenAmIst)).toBe(false);
});

test("deduplicates pending primary follow-ups even when requested times differ", async () => {
  setSystemTime(new Date("2026-07-14T04:00:00.000Z"));
  const firstDelay = 3 * 60 * 60 * 1000;
  const secondDelay = 4 * 60 * 60 * 1000;
  const firstJobId =
    `delayed-weather-pipeline-${Math.floor((Date.now() + firstDelay) / 60_000)}`;
  const secondJobId =
    `delayed-weather-pipeline-${Math.floor((Date.now() + secondDelay) / 60_000)}`;
  add
    .mockResolvedValueOnce({ id: firstJobId })
    .mockResolvedValueOnce({ id: firstJobId });

  await scheduleJob(firstDelay);
  await scheduleJob(secondDelay);

  expect(add).toHaveBeenCalledTimes(2);
  expect(add.mock.calls[0]?.[2]).toMatchObject({
    jobId: firstJobId,
    deduplication: {
      id: "primary-delayed-follow-up",
      keepLastIfActive: true,
    },
  });
  expect(add.mock.calls[1]?.[2]).toMatchObject({
    jobId: secondJobId,
    deduplication: {
      id: "primary-delayed-follow-up",
      keepLastIfActive: true,
    },
  });
});
