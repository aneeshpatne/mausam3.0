import { expect, test } from "bun:test";
import { getSourceImage } from "./get-source-image";
import type { WeatherImage } from "./radar-image";

test("routes direct and screenshot sources to the correct image loader", async () => {
  const calls: string[] = [];
  const dependencies = {
    fetchDirect: async (url: string) => {
      calls.push(`direct:${url}`);
      return Buffer.from("radar");
    },
    captureScreenshot: async (url: string) => {
      calls.push(`screenshot:${url}`);
      return Buffer.from("windy");
    },
  };
  const direct: WeatherImage = {
    kind: "direct",
    url: "https://example.com/radar.gif",
    bucketName: "radar",
  };
  const screenshot: WeatherImage = {
    kind: "screenshot",
    url: "https://example.com/map",
    bucketName: "satellite",
  };

  expect((await getSourceImage(direct, dependencies)).toString()).toBe("radar");
  expect((await getSourceImage(screenshot, dependencies)).toString()).toBe(
    "windy",
  );
  expect(calls).toEqual([
    "direct:https://example.com/radar.gif",
    "screenshot:https://example.com/map",
  ]);
});
