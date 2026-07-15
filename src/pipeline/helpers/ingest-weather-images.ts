import type { WeatherImage } from "../../data/radar/radar-image";
import {
  getSourceImage,
  resolveWeatherImage,
  type ResolvedWeatherImage,
} from "../../data/radar/get-source-image";
import { uploadWithLimit } from "../../storage/s3/helpers/upload-with-limit";

interface IngestDependencies {
  getImage: (image: ResolvedWeatherImage) => Promise<Buffer>;
  upload: (bucketName: string, image: Buffer) => Promise<boolean>;
}

export interface IngestResult {
  changedBuckets: string[];
  failedOptionalBuckets: string[];
}

const defaultDependencies: IngestDependencies = {
  getImage: getSourceImage,
  upload: uploadWithLimit,
};

export async function ingestWeatherImages(
  images: WeatherImage[],
  dependencies: IngestDependencies = defaultDependencies,
): Promise<IngestResult> {
  const result: IngestResult = { changedBuckets: [], failedOptionalBuckets: [] };
  for (const image of images) {
    try {
      const resolvedImage = await resolveWeatherImage(image);
      console.log(`[pipeline] Fetching weather image from ${resolvedImage.url}.`);
      const imageBuffer = await dependencies.getImage(resolvedImage);
      if (await dependencies.upload(image.bucketName, imageBuffer)) {
        result.changedBuckets.push(image.bucketName);
      }
    } catch (error) {
      if (!image.required) {
        result.failedOptionalBuckets.push(image.bucketName);
        console.error(
          `[pipeline] Optional weather source ${image.bucketName} failed. Continuing with the latest stored image when available.`,
          error,
        );
        continue;
      }

      throw error;
    }
  }
  return result;
}
