import { expect, test } from "bun:test";
import sharp from "sharp";
import { areBuffersSame, areImagesVisuallySame } from "./are-same";

test("compares only the visible bytes of buffer views", () => {
  const backing = Buffer.from("xradary");
  const view = backing.subarray(1, 6);
  expect(areBuffersSame(view, Buffer.from("radar"))).toBe(true);
  expect(areBuffersSame(view, Buffer.from("storm"))).toBe(false);
});

test("ignores tiny render noise but detects material image changes", async () => {
  const base = await sharp({
    create: { width: 64, height: 64, channels: 3, background: "#808080" },
  }).jpeg().toBuffer();
  const tinyNoise = await sharp({
    create: { width: 64, height: 64, channels: 3, background: "#818181" },
  }).jpeg().toBuffer();
  const changed = await sharp({
    create: { width: 64, height: 64, channels: 3, background: "#ffffff" },
  }).jpeg().toBuffer();
  await expect(areImagesVisuallySame(base, tinyNoise)).resolves.toBe(true);
  await expect(areImagesVisuallySame(base, changed)).resolves.toBe(false);
});
