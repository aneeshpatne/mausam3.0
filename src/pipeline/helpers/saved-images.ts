import type { WeatherAgentImageInput } from "../../ai/agents/weather-agent";
import { images } from "../../data/radar/radar-image";
import { findLatestObjectStatsFromBucket } from "../../storage/s3/helpers/list-objects";

const imageLabelsByBucket: Record<string, string> = {
  "radar-max-z": "MAX-Z radar",
  "radar-ppi-z": "PPI-Z radar",
  "radar-sri": "SRI rainfall estimate",
  satellite: "Windy rain accumulation",
  gfs: "GFS model forecast for next 6 hours",
  ecmwf: "ECMWF model forecast for next 6 hours",
};

export async function collectSavedImages(
  findLatest = findLatestObjectStatsFromBucket,
): Promise<WeatherAgentImageInput[]> {
  const savedImages: WeatherAgentImageInput[] = (
    await Promise.all(
      images.map(async (imageObj) => {
        const latestObject = await findLatest(imageObj.bucketName);
        const latestKey = latestObject?.last?.Key;

        if (!latestKey) {
          if (imageObj.required) {
            throw new Error(
              `Missing latest image for required weather source ${imageObj.bucketName}`,
            );
          }
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
