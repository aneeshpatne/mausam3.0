import sharp from "sharp";

const TROPICAL_TIDBITS_REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  Referer: "https://www.example.com/analysis/models/",
};

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
    ...(new URL(url).hostname.endsWith("example.com")
      ? { headers: TROPICAL_TIDBITS_REQUEST_HEADERS }
      : {}),
  };
}
