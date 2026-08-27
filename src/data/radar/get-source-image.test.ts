import { expect, test } from "bun:test";
import { getSourceImage, resolveWeatherImage } from "./get-source-image";
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
    required: true,
  };
  const screenshot: WeatherImage = {
    kind: "screenshot",
    url: "https://example.com/map",
    bucketName: "satellite",
    required: false,
  };
  const gfs: WeatherImage = {
    kind: "direct",
    url: "https://example.com/gfs/{RUN_ID}.png",
    bucketName: "gfs",
    required: false,
  };
  const ecmwf: WeatherImage = {
    kind: "direct",
    url: "https://example.com/ecmwf/{RUN_ID}.png",
    bucketName: "ecmwf",
    required: false,
  };

  expect((await getSourceImage(direct, dependencies)).toString()).toBe("radar");
  expect((await getSourceImage(screenshot, dependencies)).toString()).toBe(
    "windy",
  );
  expect((await getSourceImage(gfs, dependencies)).toString()).toBe("radar");
  expect((await getSourceImage(ecmwf, dependencies)).toString()).toBe("radar");
  expect(calls).toEqual([
    "direct:https://example.com/radar.gif",
    "screenshot:https://example.com/map",
    "direct:https://example.com/gfs/{RUN_ID}.png",
    "direct:https://example.com/ecmwf/{RUN_ID}.png",
  ]);
});

test("resolves dynamic image URLs before fetching", async () => {
  const image: WeatherImage = {
    kind: "direct",
    url: "https://example.com/template.png",
    bucketName: "gfs",
    required: false,
    determineUrl: async () => "https://example.com/final.png",
  };

  await expect(resolveWeatherImage(image)).resolves.toEqual({
    kind: "direct",
    url: "https://example.com/final.png",
    bucketName: "gfs",
    required: false,
  });
});
