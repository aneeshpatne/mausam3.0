import { expect, test } from "bun:test";
import { buildTropicalTidbitsUrl, GFS_CONFIG } from "../radar/source";
import { captureWindyScreenshot } from "./screenshot";

function makeBrowser(options: { screenshotError?: Error } = {}) {
  let closed = false;
  const calls: string[] = [];
  const gotoUrls: string[] = [];
  const browser = {
    async newPage() {
      return {
        async goto(url: string) {
          calls.push("goto");
          gotoUrls.push(url);
        },
        async waitForSelector() {
          calls.push("canvas");
        },
        async waitForFunction() {
          calls.push("content");
        },
        async screenshot() {
          calls.push("screenshot");
          if (options.screenshotError) throw options.screenshotError;
          return new Uint8Array([0xff, 0xd8, 0xff]);
        },
      };
    },
    async close() {
      closed = true;
    },
  };

  return { browser, calls, gotoUrls, wasClosed: () => closed };
}

test("captures the rendered Windy page and closes the browser", async () => {
  const mock = makeBrowser();
  const result = await captureWindyScreenshot(
    "https://example.com/windy",
    async () => mock.browser,
  );

  expect(result).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
  expect(mock.calls).toEqual(["goto", "canvas", "content", "screenshot"]);
  expect(mock.gotoUrls).toEqual(["https://example.com/windy"]);
  expect(mock.wasClosed()).toBe(true);
});

test("captures a Tropical Tidbits model page with the model wait path", async () => {
  const mock = makeBrowser();
  const modelUrl = buildTropicalTidbitsUrl(GFS_CONFIG, "2026070412", 2);
  const result = await captureWindyScreenshot(
    modelUrl,
    async () => mock.browser,
  );

  expect(result).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
  expect(mock.calls).toEqual(["goto", "canvas", "content", "screenshot"]);
  expect(mock.gotoUrls).toEqual([modelUrl]);
  expect(mock.wasClosed()).toBe(true);
});

test("closes the browser when screenshot capture fails", async () => {
  const mock = makeBrowser({ screenshotError: new Error("capture failed") });

  await expect(
    captureWindyScreenshot(
      "https://example.com/windy",
      async () => mock.browser,
    ),
  ).rejects.toThrow("capture failed");
  expect(mock.wasClosed()).toBe(true);
});
