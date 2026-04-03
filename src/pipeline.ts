import type { WeatherAgentImageInput } from "./ai/agents/weather-agent";
import { weatherAgent } from "./ai/agents/weather-agent";
import { fetchImageAsJpeg } from "./data/radar/get-image";
import { images } from "./data/radar/radar-image";
import { listObjectsFromBuckets } from "./storage/s3/helpers/list-objects";
import { uploadWithLimit } from "./storage/s3/helpers/upload-with-limit";

export interface PipelineState {
  changed: boolean;
}

export const state: PipelineState = {
  changed: false,
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
        const keys = (await listObjectsFromBuckets(imageObj.bucketName))
          .map((item) => item.Key)
          .filter((key): key is string => key !== undefined);

        return keys.map(
          (key) => ({
            type: "image" as const,
            url: `${process.env.R2_PUBLIC_BASE_URL}${imageObj.bucketName}/${key}`,
          }),
        );
      }),
    )
  ).flat();
  console.log(savedImages);
  await weatherAgent(savedImages);
}

await runPipeline();
