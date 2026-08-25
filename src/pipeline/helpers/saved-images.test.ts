import { expect, test } from "bun:test";
import { collectSavedImages } from "./saved-images";

test("collects the two newest images per bucket in chronological order", async () => {
  const images = await collectSavedImages(async (bucket) => [
    {
      Key: `${bucket}-latest.jpeg`,
      LastModified: "2026-08-11T10:00:00.000Z",
    },
    {
      Key: `${bucket}-oldest.jpeg`,
      LastModified: "2026-08-11T08:00:00.000Z",
    },
    {
      Key: `${bucket}-previous.jpeg`,
      LastModified: "2026-08-11T09:00:00.000Z",
    },
  ], "https://example.com/");

  expect(images).toHaveLength(10);
  expect(images[0]?.url).toEndWith("radar-ppi-z-previous.jpeg");
  expect(images[0]?.label).toContain("PPI-Z radar (previous frame, captured");
  expect(images[1]?.url).toEndWith("radar-ppi-z-latest.jpeg");
  expect(images[1]?.label).toContain("PPI-Z radar (latest frame, captured");
  expect(images[4]?.label).toContain("Windy rain accumulation (previous frame");
  expect(images[6]?.label).toContain("GFS model forecast for next 6 hours");
  expect(images[8]?.label).toContain("ECMWF model forecast for next 6 hours");
});

test("allows optional sources to be absent while requiring required images", async () => {
  const oneImageUnlessMissing = (missingBucket: string) => async (bucket: string) =>
    bucket === missingBucket ? [] : [{ Key: `${bucket}.jpeg` }];

  const withoutWindy = await collectSavedImages(
    oneImageUnlessMissing("satellite"),
    "https://example.com/",
  );
  expect(withoutWindy).toHaveLength(4);

  const withoutGfs = await collectSavedImages(
    oneImageUnlessMissing("gfs"),
    "https://example.com/",
  );
  expect(withoutGfs).toHaveLength(4);

  const withoutEcmwf = await collectSavedImages(
    oneImageUnlessMissing("ecmwf"),
    "https://example.com/",
  );
  expect(withoutEcmwf).toHaveLength(4);

  await expect(
    collectSavedImages(
      oneImageUnlessMissing("radar-sri"),
      "https://example.com/",
    ),
  ).rejects.toThrow("Missing latest image for required weather source radar-sri");
});
