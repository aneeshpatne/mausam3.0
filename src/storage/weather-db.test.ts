import { afterEach, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { readSiteData, saveOutlookReport, savePrimaryReport } from "./weather-db";

const path = `/tmp/mausam-weather-db-${process.pid}.sqlite`;
afterEach(() => {
  for (const suffix of ["", "-wal", "-shm"]) rmSync(`${path}${suffix}`, { force: true });
});

test("stores reports and returns a build-ready snapshot", () => {
  savePrimaryReport({ alert: "yellow", headline: "Showers possible", summary: "Rain may develop.", analysedAt: "2026-08-28T08:00:00.000Z", rainChance: 60, expectedPeak: "Evening", confidence: "Medium", agentNote: "Signal strengthened.", temperatureC: 28, feelsLikeC: 32, wind: "W 10 km/h", rainRate: null, station: "Borivali", stationUpdatedAt: "13:25", sourceSummary: "Radar and station current." }, path);
  saveOutlookReport({ alert: "green", headline: "Quieter week", modelRead: "Models ease.", reasoning: "Both reduce rain.", analysedAt: "2026-08-28T07:00:00.000Z", days: Array.from({ length: 5 }, (_, index) => ({ date: `2026-09-0${index + 1}`, label: `D${index + 1}`, rain: "Light", chance: 30, rainfall: "Light", alert: "green" })) }, path);
  const data = readSiteData(path);
  expect(data.primary?.headline).toBe("Showers possible");
  expect(data.outlook?.days).toHaveLength(5);
  expect(data.runs.map((run) => run.agent)).toEqual(["Nowcast", "Outlook"]);
});
