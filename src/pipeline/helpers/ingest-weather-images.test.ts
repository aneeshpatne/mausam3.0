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
  url: "https://www.example.com/analysis/models/gfs/{RUN_ID}/gfs_mslp_pcpn_india_2.png",
  bucketName: "gfs",
  required: false,
  determineUrl: async () =>
    "https://www.example.com/analysis/models/gfs/2026070412/gfs_mslp_pcpn_india_2.png",
};
const ecmwf: WeatherImage = {
  kind: "direct",
  url: "https://www.example.com/analysis/models/ecmwf/{RUN_ID}/ecmwf_mslp_pcpn_india_2.png",
  bucketName: "ecmwf",
  required: false,
  determineUrl: async () =>
    "https://www.example.com/analysis/models/ecmwf/2026070412/ecmwf_mslp_pcpn_india_2.png",
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
    "gfs:direct:https://www.example.com/analysis/models/gfs/2026070412/gfs_mslp_pcpn_india_2.png",
    "ecmwf:direct:https://www.example.com/analysis/models/ecmwf/2026070412/ecmwf_mslp_pcpn_india_2.png",
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
