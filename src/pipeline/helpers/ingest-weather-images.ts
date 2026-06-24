import type { WeatherImage } from "../../data/radar/radar-image";
import { getSourceImage } from "../../data/radar/get-source-image";
import { uploadWithLimit } from "../../storage/s3/helpers/upload-with-limit";

interface IngestDependencies {
  getImage: (image: WeatherImage) => Promise<Buffer>;
  upload: (bucketName: string, image: Buffer) => Promise<void>;
}

const defaultDependencies: IngestDependencies = {
  getImage: getSourceImage,
  upload: uploadWithLimit,
};

export async function ingestWeatherImages(
  images: WeatherImage[],
  dependencies: IngestDependencies = defaultDependencies,
): Promise<void> {
  for (const image of images) {
    console.log(`[pipeline] Fetching weather image from ${image.url}.`);
    try {
      const imageBuffer = await dependencies.getImage(image);
      await dependencies.upload(image.bucketName, imageBuffer);
    } catch (error) {
      if (image.kind === "screenshot") {
        console.error(
          "[pipeline] Windy screenshot failed. Continuing with the latest stored image when available.",
          error,
        );
        continue;
      }

      throw error;
    }
  }
}
