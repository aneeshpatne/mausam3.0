import { expect, test } from "bun:test";
import { collectSavedImages } from "./saved-images";

test("uses an older stored Windy image when one exists", async () => {
  const images = await collectSavedImages(async (bucket) => ({
    first: undefined,
    last: { Key: `${bucket}.jpeg` },
  }));

  expect(images).toHaveLength(3);
  expect(images[2]?.label).toBe("Windy rain accumulation");
});

test("allows Windy to be absent while requiring both radar images", async () => {
  const withoutWindy = await collectSavedImages(async (bucket) => ({
    first: undefined,
    last: bucket === "satellite" ? undefined : { Key: `${bucket}.jpeg` },
  }));
  expect(withoutWindy).toHaveLength(2);

  await expect(
    collectSavedImages(async (bucket) => ({
      first: undefined,
      last: bucket === "radar-sri" ? undefined : { Key: `${bucket}.jpeg` },
    })),
  ).rejects.toThrow("Missing latest image for required weather source radar-sri");
});
