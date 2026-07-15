import { expect, test } from "bun:test";
import { collectSavedImages } from "./saved-images";

test("uses an older stored Windy image when one exists", async () => {
  const images = await collectSavedImages(async (bucket) => ({
    first: undefined,
    last: { Key: `${bucket}.jpeg` },
  }), "https://example.com/");

  expect(images).toHaveLength(5);
  expect(images[2]?.label).toBe("Windy rain accumulation");
  expect(images[3]?.label).toBe("GFS model forecast for next 6 hours");
  expect(images[4]?.label).toBe("ECMWF model forecast for next 6 hours");
});

test("allows optional sources to be absent while requiring required images", async () => {
  const withoutWindy = await collectSavedImages(async (bucket) => ({
    first: undefined,
    last: bucket === "satellite" ? undefined : { Key: `${bucket}.jpeg` },
  }), "https://example.com/");
  expect(withoutWindy).toHaveLength(4);

  const withoutGfs = await collectSavedImages(async (bucket) => ({
    first: undefined,
    last: bucket === "gfs" ? undefined : { Key: `${bucket}.jpeg` },
  }), "https://example.com/");
  expect(withoutGfs).toHaveLength(4);

  const withoutEcmwf = await collectSavedImages(async (bucket) => ({
    first: undefined,
    last: bucket === "ecmwf" ? undefined : { Key: `${bucket}.jpeg` },
  }), "https://example.com/");
  expect(withoutEcmwf).toHaveLength(4);

  await expect(
    collectSavedImages(async (bucket) => ({
      first: undefined,
      last: bucket === "radar-sri" ? undefined : { Key: `${bucket}.jpeg` },
    }), "https://example.com/"),
  ).rejects.toThrow("Missing latest image for required weather source radar-sri");
});
