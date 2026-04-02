import sharp from "sharp";

export async function fetchImageAsJpeg(url: string): Promise<Buffer> {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Image fetch failed");
  }
  const arrayBuffer = await res.arrayBuffer();
  const jpegBuffer = await sharp(arrayBuffer).jpeg({ quality: 20 }).toBuffer();
  return jpegBuffer;
}

export async function fetchImage(url: string): Promise<Buffer> {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Image fetch failed");
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
