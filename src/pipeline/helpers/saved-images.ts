import type { WeatherAgentImageInput } from "../../ai/agents/weather-agent";
import { images } from "../../data/radar/radar-image";
import { findLatestObjectStatsFromBucket } from "../../storage/s3/helpers/list-objects";

const imageLabelsByBucket: Record<string, string> = {
  "radar-max-z": "MAX-Z radar",
  "radar-ppi-z": "PPI-Z radar",
  "radar-sri": "SRI rainfall estimate",
  satellite: "Infrared satellite",
};

export async function collectSavedImages(): Promise<WeatherAgentImageInput[]> {
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
          },
        ];
      }),
    )
  ).flat();

  return savedImages;
}
