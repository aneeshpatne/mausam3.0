import { expect, test } from "bun:test";
import type { WeatherImage } from "../../data/radar/radar-image";
import { ingestWeatherImages } from "./ingest-weather-images";

const direct: WeatherImage = {
  kind: "direct",
  url: "https://example.com/radar.gif",
  bucketName: "radar",
};
const windy: WeatherImage = {
  kind: "screenshot",
  url: "https://example.com/windy",
  bucketName: "satellite",
};

test("uploads direct and Windy images with the existing upload boundary", async () => {
  const uploads: string[] = [];
  await ingestWeatherImages([direct, windy], {
    getImage: async (image) => Buffer.from(image.kind),
    upload: async (bucket, image) => {
      uploads.push(`${bucket}:${image.toString()}`);
    },
  });

  expect(uploads).toEqual(["radar:direct", "satellite:screenshot"]);
});

test("continues when Windy fails but preserves fatal direct-source errors", async () => {
  const uploads: string[] = [];
  await ingestWeatherImages([windy, direct], {
    getImage: async (image) => {
      if (image.kind === "screenshot") throw new Error("Windy unavailable");
      return Buffer.from("radar");
    },
    upload: async (bucket) => {
      uploads.push(bucket);
    },
  });
  expect(uploads).toEqual(["radar"]);

  await expect(
    ingestWeatherImages([direct], {
      getImage: async () => {
        throw new Error("Radar unavailable");
      },
      upload: async () => {},
    }),
  ).rejects.toThrow("Radar unavailable");
});
