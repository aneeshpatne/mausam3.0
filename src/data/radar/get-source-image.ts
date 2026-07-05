import type { WeatherImage } from "./radar-image";
import { fetchImageAsJpeg } from "./get-image";
import { captureWindyScreenshot } from "../windy/screenshot";

export type ResolvedWeatherImage = Omit<WeatherImage, "determineUrl">;

interface ImageSourceDependencies {
  fetchDirect: (url: string) => Promise<Buffer>;
  captureScreenshot: (url: string) => Promise<Buffer>;
}

const defaultDependencies: ImageSourceDependencies = {
  fetchDirect: fetchImageAsJpeg,
  captureScreenshot: captureWindyScreenshot,
};

export async function getSourceImage(
  image: ResolvedWeatherImage,
  dependencies: ImageSourceDependencies = defaultDependencies,
): Promise<Buffer> {
  if (image.kind === "screenshot") {
    return dependencies.captureScreenshot(image.url);
  }

  return dependencies.fetchDirect(image.url);
}

export async function resolveWeatherImage(
  image: WeatherImage,
): Promise<ResolvedWeatherImage> {
  if (!image.determineUrl) {
    return image;
  }

  const resolvedUrl = await image.determineUrl();
  const { determineUrl: _determineUrl, ...resolvedImage } = image;
  return {
    ...resolvedImage,
    url: resolvedUrl,
  };
}
