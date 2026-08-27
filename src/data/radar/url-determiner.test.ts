import { expect, test } from "bun:test";
import {
  buildTropicalTidbitsUrl,
  ECMWF_CONFIG,
  GFS_CONFIG,
} from "./source";
import {
  determineGfsUrls,
  ecmwfUrlDeterminer,
  urlDeterminer,
} from "./url-determiner";

function gfsUrl(runId: string, frame = 2): string {
  return buildTropicalTidbitsUrl(GFS_CONFIG, runId, frame);
}

function ecmwfUrl(runId: string, frame = 2): string {
  return buildTropicalTidbitsUrl(ECMWF_CONFIG, runId, frame);
}

function makeFetch(statusByUrl: Record<string, number>) {
  const calls: Array<{ method: string; url: string }> = [];
  const fetchImpl: (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ) => ReturnType<typeof fetch> = async (input, init) => {
    const url = String(input);
    calls.push({ method: init?.method ?? "GET", url });
    const status = statusByUrl[url] ?? 200;
    return new Response(null, { status });
  };

  return { calls, fetchImpl };
}

test("uses the previous day's 18Z run before 00Z cooldown expires", async () => {
  const expectedUrl = gfsUrl("2026070318");
  const { calls, fetchImpl } = makeFetch({ [expectedUrl]: 200 });

  await expect(
    urlDeterminer(new Date("2026-07-04T00:59:00Z"), 2, fetchImpl),
  ).resolves.toBe(expectedUrl);
  expect(calls).toEqual([{ method: "GET", url: expectedUrl }]);
});

test("uses the 00Z run once the cooldown expires", async () => {
  const expectedUrl = gfsUrl("2026070400");
  const { calls, fetchImpl } = makeFetch({ [expectedUrl]: 200 });

  await expect(
    urlDeterminer(new Date("2026-07-04T01:00:00Z"), 2, fetchImpl),
  ).resolves.toBe(expectedUrl);
  expect(calls).toEqual([{ method: "GET", url: expectedUrl }]);
});

test("uses the 12Z run for the July 4, 2026 7:37 PM IST example", async () => {
  const expectedUrl = gfsUrl("2026070412");
  const { calls, fetchImpl } = makeFetch({ [expectedUrl]: 200 });

  await expect(
    urlDeterminer(new Date("2026-07-04T14:07:00Z"), 2, fetchImpl),
  ).resolves.toBe(expectedUrl);
  expect(calls).toEqual([{ method: "GET", url: expectedUrl }]);
});

test("uses the 18Z run once its cooldown expires", async () => {
  const expectedUrl = gfsUrl("2026070418");
  const { calls, fetchImpl } = makeFetch({ [expectedUrl]: 200 });

  await expect(
    urlDeterminer(new Date("2026-07-04T19:00:00Z"), 2, fetchImpl),
  ).resolves.toBe(expectedUrl);
  expect(calls).toEqual([{ method: "GET", url: expectedUrl }]);
});

test("falls back one run when the latest eligible URL returns 404", async () => {
  const latestUrl = gfsUrl("2026070412");
  const previousUrl = gfsUrl("2026070406");
  const { calls, fetchImpl } = makeFetch({
    [latestUrl]: 404,
    [previousUrl]: 200,
  });

  await expect(
    urlDeterminer(new Date("2026-07-04T14:07:00Z"), 2, fetchImpl),
  ).resolves.toBe(previousUrl);
  expect(calls).toEqual([
    { method: "GET", url: latestUrl },
    { method: "GET", url: previousUrl },
  ]);
});

test("throws when the latest eligible URL returns a non-404 error", async () => {
  const latestUrl = gfsUrl("2026070412");
  const { fetchImpl } = makeFetch({ [latestUrl]: 500 });

  await expect(
    urlDeterminer(new Date("2026-07-04T14:07:00Z"), 2, fetchImpl),
  ).rejects.toThrow("GFS image probe failed with status 500");
});

test("throws when both the latest and previous runs return 404", async () => {
  const latestUrl = gfsUrl("2026070412");
  const previousUrl = gfsUrl("2026070406");
  const { fetchImpl } = makeFetch({
    [latestUrl]: 404,
    [previousUrl]: 404,
  });

  await expect(
    urlDeterminer(new Date("2026-07-04T14:07:00Z"), 2, fetchImpl),
  ).rejects.toThrow("404");
});

test("uses the latest eligible ECMWF run", async () => {
  const expectedUrl = ecmwfUrl("2026070412");
  const { calls, fetchImpl } = makeFetch({ [expectedUrl]: 200 });

  await expect(
    ecmwfUrlDeterminer(new Date("2026-07-04T14:34:00Z"), 2, fetchImpl),
  ).resolves.toBe(expectedUrl);
  expect(calls).toEqual([{ method: "GET", url: expectedUrl }]);
});

test("falls back one ECMWF run when the latest eligible URL returns 404", async () => {
  const latestUrl = ecmwfUrl("2026070412");
  const previousUrl = ecmwfUrl("2026070406");
  const { calls, fetchImpl } = makeFetch({
    [latestUrl]: 404,
    [previousUrl]: 200,
  });

  await expect(
    ecmwfUrlDeterminer(new Date("2026-07-04T14:34:00Z"), 2, fetchImpl),
  ).resolves.toBe(previousUrl);
  expect(calls).toEqual([
    { method: "GET", url: latestUrl },
    { method: "GET", url: previousUrl },
  ]);
});

test("throws when the latest eligible ECMWF URL returns a non-404 error", async () => {
  const latestUrl = ecmwfUrl("2026070412");
  const { fetchImpl } = makeFetch({ [latestUrl]: 500 });

  await expect(
    ecmwfUrlDeterminer(new Date("2026-07-04T14:34:00Z"), 2, fetchImpl),
  ).rejects.toThrow("ECMWF image probe failed with status 500");
});

test("throws when both the latest and previous ECMWF runs return 404", async () => {
  const latestUrl = ecmwfUrl("2026070412");
  const previousUrl = ecmwfUrl("2026070406");
  const { fetchImpl } = makeFetch({
    [latestUrl]: 404,
    [previousUrl]: 404,
  });

  await expect(
    ecmwfUrlDeterminer(new Date("2026-07-04T14:34:00Z"), 2, fetchImpl),
  ).rejects.toThrow("404");
});

test("selects one complete run for every requested model frame", async () => {
  const frames = [8, 16] as const;
  const latestFrame16 = gfsUrl("2026070412", 16);
  const { fetchImpl } = makeFetch({ [latestFrame16]: 404 });

  const urls = await determineGfsUrls(
    new Date("2026-07-04T14:07:00Z"),
    frames,
    fetchImpl,
  );
  expect([...urls.values()]).toEqual([
    gfsUrl("2026070406", 8),
    gfsUrl("2026070406", 16),
  ]);
});
