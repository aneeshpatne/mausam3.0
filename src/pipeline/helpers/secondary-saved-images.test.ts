import { expect, test } from "bun:test";
import { collectSecondarySavedImages } from "./secondary-saved-images";

function bucketWith(keys: string[]) {
  return async () =>
    keys.map((key) => ({
      Key: key,
      LastModified: new Date(key.includes("old") ? 1 : 2),
    }));
}

test("collects one latest image per model+frame group", async () => {
  const images = await collectSecondarySavedImages(
    bucketWith([
      "gfs-8-old.jpeg",
      "gfs-8-new.jpeg",
      "gfs-16-new.jpeg",
      "gfs-24-new.jpeg",
      "gfs-32-new.jpeg",
      "gfs-40-new.jpeg",
      "ecmwf-8-new.jpeg",
      "ecmwf-16-new.jpeg",
      "ecmwf-24-new.jpeg",
      "ecmwf-32-new.jpeg",
      "ecmwf-40-new.jpeg",
    ]),
    "https://example.com/",
  );

  expect(images).toHaveLength(10);
  expect(images[0]?.label).toBe("GFS model forecast for +24h");
  expect(images[0]?.url).toContain("gfs-8-new.jpeg");
  expect(images[1]?.label).toBe("GFS model forecast for +48h");
  expect(images[2]?.label).toBe("GFS model forecast for +72h");
  expect(images[3]?.label).toBe("GFS model forecast for +96h");
  expect(images[4]?.label).toBe("GFS model forecast for +120h");
  expect(images[5]?.label).toBe("ECMWF model forecast for +24h");
  expect(images[6]?.label).toBe("ECMWF model forecast for +48h");
  expect(images[7]?.label).toBe("ECMWF model forecast for +72h");
  expect(images[8]?.label).toBe("ECMWF model forecast for +96h");
  expect(images[9]?.label).toBe("ECMWF model forecast for +120h");
});

test("skips missing frames without throwing", async () => {
  const images = await collectSecondarySavedImages(
    bucketWith(["gfs-8-new.jpeg", "ecmwf-40-new.jpeg"]),
    "https://example.com/",
  );

  expect(images).toHaveLength(2);
  expect(images[0]?.label).toBe("GFS model forecast for +24h");
  expect(images[1]?.label).toBe("ECMWF model forecast for +120h");
});

test("returns empty list when bucket has no matches", async () => {
  const images = await collectSecondarySavedImages(bucketWith([]), "https://example.com/");
  expect(images).toHaveLength(0);
});

test("collects images stored under an atomic run prefix", async () => {
  const images = await collectSecondarySavedImages(
    bucketWith([
      "run-2026-07-14T01:30:00.000Z/gfs-8.jpeg",
      "run-2026-07-14T01:30:00.000Z/ecmwf-40.jpeg",
    ]),
    "https://example.com/",
  );
  expect(images.map((image) => image.label)).toEqual([
    "GFS model forecast for +24h",
    "ECMWF model forecast for +120h",
  ]);
});
