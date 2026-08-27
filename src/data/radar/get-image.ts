import sharp from "sharp";
import {
  isTropicalTidbitsUrl,
  TROPICAL_TIDBITS_REQUEST_HEADERS,
} from "./source";

export async function fetchImageAsJpeg(url: string): Promise<Buffer> {
  const res = await fetch(url, getImageFetchInit(url));

  if (!res.ok) {
    throw new Error(`Image fetch failed with HTTP ${res.status} for ${url}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const jpegBuffer = await sharp(arrayBuffer)
    .resize(800, 800, {
      fit: "cover",
      position: "center",
    })
    .jpeg({ quality: 20 })
    .toBuffer();
  return jpegBuffer;
}

export async function fetchImage(url: string): Promise<Buffer> {
  const res = await fetch(url, getImageFetchInit(url));

  if (!res.ok) {
    throw new Error(`Image fetch failed with HTTP ${res.status} for ${url}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function getImageFetchInit(url: string): RequestInit | undefined {
  return {
    signal: AbortSignal.timeout(30_000),
    ...(isTropicalTidbitsUrl(url)
      ? { headers: TROPICAL_TIDBITS_REQUEST_HEADERS }
      : {}),
  };
}
