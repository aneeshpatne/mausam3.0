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
      "gfs-24-new.jpeg",
      "gfs-40-new.jpeg",
      "ecmwf-8-new.jpeg",
      "ecmwf-24-new.jpeg",
      "ecmwf-40-new.jpeg",
    ]),
  );

  expect(images).toHaveLength(6);
  expect(images[0]?.label).toBe("GFS model forecast for +24h");
  expect(images[0]?.url).toContain("gfs-8-new.jpeg");
  expect(images[1]?.label).toBe("GFS model forecast for +72h");
  expect(images[2]?.label).toBe("GFS model forecast for +120h");
  expect(images[3]?.label).toBe("ECMWF model forecast for +24h");
  expect(images[4]?.label).toBe("ECMWF model forecast for +72h");
  expect(images[5]?.label).toBe("ECMWF model forecast for +120h");
});

test("skips missing frames without throwing", async () => {
  const images = await collectSecondarySavedImages(
    bucketWith(["gfs-8-new.jpeg", "ecmwf-40-new.jpeg"]),
  );

  expect(images).toHaveLength(2);
  expect(images[0]?.label).toBe("GFS model forecast for +24h");
  expect(images[1]?.label).toBe("ECMWF model forecast for +120h");
});

test("returns empty list when bucket has no matches", async () => {
  const images = await collectSecondarySavedImages(bucketWith([]));
  expect(images).toHaveLength(0);
});