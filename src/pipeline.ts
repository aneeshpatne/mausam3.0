import type {
  WeatherAgentImageInput,
  WeatherAgentMode,
} from "./ai/agents/weather-agent";
import { weatherAgent } from "./ai/agents/weather-agent";
import { fetchImageAsJpeg } from "./data/radar/get-image";
import { images } from "./data/radar/radar-image";
import { findLatestObjectStatsFromBucket } from "./storage/s3/helpers/list-objects";
import { uploadWithLimit } from "./storage/s3/helpers/upload-with-limit";
import { wipeAllBuckets } from "./storage/s3/utils/wipe-buckets";

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

function getMumbaiCurrentTimeText(): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

function getMumbaiNowParts(date: Date = new Date()): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? "0",
  );

  return { hour, minute };
}

function getPipelineMode(date: Date = new Date()): WeatherAgentMode {
  const { hour, minute } = getMumbaiNowParts(date);

  if (hour === 7 && minute <= 30) {
    return "morning";
  }

  return "default";
}

export async function runPipeline(): Promise<void> {
  state.changed = false;
  const pipelineMode = getPipelineMode();

  if (pipelineMode === "morning") {
    console.log("Morning mode active for IST 7:00 AM to 7:30 AM. Wiping buckets.");
    await wipeAllBuckets();
  }

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

  await weatherAgent(savedImages, getMumbaiCurrentTimeText(), pipelineMode);
}

await runPipeline();
