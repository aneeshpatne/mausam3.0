import { expect, test } from "bun:test";
import type { WeatherImage } from "../../data/radar/radar-image";
import { ingestWeatherImages } from "./ingest-weather-images";

const direct: WeatherImage = {
  kind: "direct",
  url: "https://example.com/radar.gif",
  bucketName: "radar",
  required: true,
};
const windy: WeatherImage = {
  kind: "screenshot",
  url: "https://example.com/windy",
  bucketName: "satellite",
  required: false,
};
const gfs: WeatherImage = {
  kind: "direct",
  url: "https://example.com/gfs/{RUN_ID}.png",
  bucketName: "gfs",
  required: false,
  determineUrl: async () => "https://example.com/gfs/2026070412.png",
};
const ecmwf: WeatherImage = {
  kind: "direct",
  url: "https://example.com/ecmwf/{RUN_ID}.png",
  bucketName: "ecmwf",
  required: false,
  determineUrl: async () => "https://example.com/ecmwf/2026070412.png",
};

test("uploads direct and optional images with the existing upload boundary", async () => {
  const uploads: string[] = [];
  const result = await ingestWeatherImages([direct, windy, gfs, ecmwf], {
    getImage: async (image) => Buffer.from(`${image.kind}:${image.url}`),
    upload: async (bucket, image) => {
      uploads.push(`${bucket}:${image.toString()}`);
      return true;
    },
  });

  expect(uploads).toEqual([
    "radar:direct:https://example.com/radar.gif",
    "satellite:screenshot:https://example.com/windy",
    "gfs:direct:https://example.com/gfs/2026070412.png",
    "ecmwf:direct:https://example.com/ecmwf/2026070412.png",
  ]);
  expect(result.changedBuckets).toEqual(["radar", "satellite", "gfs", "ecmwf"]);
});

test("continues when optional sources fail but preserves fatal required-source errors", async () => {
  const uploads: string[] = [];
  await ingestWeatherImages([ecmwf, direct], {
    getImage: async (image) => {
      if (!image.required) throw new Error("Optional source unavailable");
      return Buffer.from("radar");
    },
    upload: async (bucket) => {
      uploads.push(bucket);
      return true;
    },
  });
  expect(uploads).toEqual(["radar"]);

  await expect(
    ingestWeatherImages([direct], {
      getImage: async () => {
        throw new Error("Radar unavailable");
      },
      upload: async () => true,
    }),
  ).rejects.toThrow("Radar unavailable");
});
