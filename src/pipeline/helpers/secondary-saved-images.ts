import type { WeatherAgentImageInput } from "../../ai/agents/weather-agent";
import { listObjectsFromBuckets } from "../../storage/s3/helpers/list-objects";

const BUCKET_NAME = "model-images";

interface SecondaryImageTarget {
  model: string;
  frame: number;
  label: string;
}

const TARGETS: SecondaryImageTarget[] = [
  { model: "gfs", frame: 8, label: "GFS model forecast for +24h" },
  { model: "gfs", frame: 16, label: "GFS model forecast for +48h" },
  { model: "gfs", frame: 24, label: "GFS model forecast for +72h" },
  { model: "gfs", frame: 32, label: "GFS model forecast for +96h" },
  { model: "gfs", frame: 40, label: "GFS model forecast for +120h" },
  { model: "ecmwf", frame: 8, label: "ECMWF model forecast for +24h" },
  { model: "ecmwf", frame: 16, label: "ECMWF model forecast for +48h" },
  { model: "ecmwf", frame: 24, label: "ECMWF model forecast for +72h" },
  { model: "ecmwf", frame: 32, label: "ECMWF model forecast for +96h" },
  { model: "ecmwf", frame: 40, label: "ECMWF model forecast for +120h" },
];

function keyPrefix(target: SecondaryImageTarget): string {
  return `${target.model}-${target.frame}-`;
}

export async function collectSecondarySavedImages(
  listBucket: (bucket: string) => Promise<
    { Key?: string; LastModified?: Date | string }[]
  > = listObjectsFromBuckets,
): Promise<WeatherAgentImageInput[]> {
  const contents = await listBucket(BUCKET_NAME);

  const savedImages: WeatherAgentImageInput[] = [];
  for (const target of TARGETS) {
    const prefix = keyPrefix(target);
    const matches = contents
      .filter((obj) => obj.Key?.startsWith(prefix))
      .sort((a, b) => {
        const dateA = a.LastModified ? new Date(a.LastModified).getTime() : 0;
        const dateB = b.LastModified ? new Date(b.LastModified).getTime() : 0;
        return dateB - dateA;
      });

    const latestKey = matches[0]?.Key;

    if (!latestKey) {
      console.warn(
        `[secondary-saved-images] No saved image found for ${prefix}*. Skipping.`,
      );
      continue;
    }

    savedImages.push({
      type: "image",
      url: `${process.env.R2_PUBLIC_BASE_URL}${BUCKET_NAME}/${latestKey}`,
      label: target.label,
    });
  }

  return savedImages;
}
