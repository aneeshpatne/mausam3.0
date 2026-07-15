export function areBuffersSame(
  a: ArrayBufferView,
  b: ArrayBufferView,
): boolean {
  const hashA = Bun.hash(new Uint8Array(a.buffer, a.byteOffset, a.byteLength));
  const hashB = Bun.hash(new Uint8Array(b.buffer, b.byteOffset, b.byteLength));
  return hashA === hashB;
}

export async function areImagesVisuallySame(
  a: Buffer,
  b: Buffer,
): Promise<boolean> {
  const normalize = (image: Buffer) =>
    sharp(image)
      .resize(64, 64, { fit: "fill" })
      .grayscale()
      .raw()
      .toBuffer();
  const [pixelsA, pixelsB] = await Promise.all([normalize(a), normalize(b)]);
  let totalDifference = 0;
  let materiallyChangedPixels = 0;
  for (let index = 0; index < pixelsA.length; index += 1) {
    const difference = Math.abs((pixelsA[index] ?? 0) - (pixelsB[index] ?? 0));
    totalDifference += difference;
    if (difference > 8) materiallyChangedPixels += 1;
  }
  const meanDifference = totalDifference / pixelsA.length;
  const changedFraction = materiallyChangedPixels / pixelsA.length;
  return meanDifference <= 1.5 && changedFraction <= 0.02;
}
import sharp from "sharp";
