import type { WeatherAgentImageInput } from "../../ai/agents/weather-agent";
import { images } from "../../data/radar/radar-image";
import { listObjectsFromBuckets } from "../../storage/s3/helpers/list-objects";
import { getPublicBaseUrl } from "../../config";

const imageLabelsByBucket: Record<string, string> = {
  "radar-max-z": "MAX-Z radar",
  "radar-ppi-z": "PPI-Z radar",
  "radar-sri": "SRI rainfall estimate",
  satellite: "Windy rain accumulation",
  gfs: "GFS model forecast for next 6 hours",
  ecmwf: "ECMWF model forecast for next 6 hours",
};

interface SavedImageObject {
  Key?: string;
  LastModified?: Date | string;
}

function captureTimeLabel(value: Date | string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return `${new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date)} IST`;
}

function frameLabel(
  bucketName: string,
  image: SavedImageObject,
  index: number,
  total: number,
): string {
  const sourceLabel = imageLabelsByBucket[bucketName] ?? bucketName;
  const position = total === 1 || index === total - 1
    ? "latest frame"
    : "previous frame";
  const capturedAt = captureTimeLabel(image.LastModified);
  return `${sourceLabel} (${position}${capturedAt ? `, captured ${capturedAt}` : ""})`;
}

export async function collectSavedImages(
  listBucket: (bucket: string) => Promise<SavedImageObject[]> =
    listObjectsFromBuckets,
  publicBaseUrl = getPublicBaseUrl(),
): Promise<WeatherAgentImageInput[]> {
  const savedImages: WeatherAgentImageInput[] = (
    await Promise.all(
      images.map(async (imageObj) => {
        const recentImages = (await listBucket(imageObj.bucketName))
          .filter((image): image is SavedImageObject & { Key: string } =>
            typeof image.Key === "string" && image.Key.length > 0
          )
          .sort((a, b) => {
            const dateA = a.LastModified ? new Date(a.LastModified).getTime() : 0;
            const dateB = b.LastModified ? new Date(b.LastModified).getTime() : 0;
            return dateA - dateB;
          })
          .slice(-2);

        if (recentImages.length === 0) {
          if (imageObj.required) {
            throw new Error(
              `Missing latest image for required weather source ${imageObj.bucketName}`,
            );
          }
          return [];
        }

        return recentImages.map((image, index) => ({
          type: "image" as const,
          url: `${publicBaseUrl}${imageObj.bucketName}/${image.Key}`,
          label: frameLabel(
            imageObj.bucketName,
            image,
            index,
            recentImages.length,
          ),
        }));
      }),
    )
  ).flat();

  return savedImages;
}
