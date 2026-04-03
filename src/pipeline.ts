import type { WeatherAgentImageInput } from "./ai/agents/weather-agent";
import { weatherAgent } from "./ai/agents/weather-agent";
import { fetchImageAsJpeg } from "./data/radar/get-image";
import { images } from "./data/radar/radar-image";
import { findLatestObjectStatsFromBucket } from "./storage/s3/helpers/list-objects";
import { uploadWithLimit } from "./storage/s3/helpers/upload-with-limit";

export interface PipelineState {
  changed: boolean;
}

export const state: PipelineState = {
  changed: false,
};

const imageLabelsByBucket: Record<string, string> = {
  "radar-max-z": "MAX-Z radar",
  "radar-ppi-z": "PPI-Z radar",
  "radar-sri": "SRI rainfall estimate",
  satellite: "Infrared satellite",
};

export async function runPipeline(): Promise<void> {
  for (const imageObj of images) {
    console.log(imageObj.url);
    const imageBuffer = await fetchImageAsJpeg(imageObj.url);
    await uploadWithLimit(imageObj.bucketName, imageBuffer);
  }

  if (state.changed === false) {
    console.log("All images are same, skipping this attempt");
    return;
  }
  console.log("Images have changed proceeding with AI summarization");
  const savedImages: WeatherAgentImageInput[] = (
    await Promise.all(
      images.map(async (imageObj) => {
        const latestObject = await findLatestObjectStatsFromBucket(
          imageObj.bucketName,
        );
        const latestKey = latestObject?.last?.Key;

        if (!latestKey) {
          return [];
        }

        return [
          {
            type: "image" as const,
            url: `${process.env.R2_PUBLIC_BASE_URL}${imageObj.bucketName}/${latestKey}`,
            label:
              imageLabelsByBucket[imageObj.bucketName] ?? imageObj.bucketName,
            bucketName: imageObj.bucketName,
          },
        ];
      }),
    )
  ).flat();

  if (savedImages.length !== images.length) {
    throw new Error("Missing latest image for one or more weather sources");
  }

  await weatherAgent(savedImages);
}

await runPipeline();
