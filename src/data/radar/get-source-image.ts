import type { WeatherImage } from "./radar-image";
import { fetchImageAsJpeg } from "./get-image";
import { captureWindyScreenshot } from "../windy/screenshot";

interface ImageSourceDependencies {
  fetchDirect: (url: string) => Promise<Buffer>;
  captureScreenshot: (url: string) => Promise<Buffer>;
}

const defaultDependencies: ImageSourceDependencies = {
  fetchDirect: fetchImageAsJpeg,
  captureScreenshot: captureWindyScreenshot,
};

export async function getSourceImage(
  image: WeatherImage,
  dependencies: ImageSourceDependencies = defaultDependencies,
): Promise<Buffer> {
  if (image.kind === "screenshot") {
    return dependencies.captureScreenshot(image.url);
  }

  return dependencies.fetchDirect(image.url);
}
