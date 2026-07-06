import { emptyBucket } from "./storage/s3/helpers/delete-items-in-bucket";
import { uploadToBucketWithKey } from "./storage/s3/helpers/upload";
import { urlDeterminer, ecmwfUrlDeterminer } from "./data/radar/url-determiner";
import { fetchImageAsJpeg } from "./data/radar/get-image";
import { collectSecondarySavedImages } from "./pipeline/helpers/secondary-saved-images";
import { secondaryAgent } from "./ai/agents/secondary-agent";
import { getMumbaiCurrentTimeText } from "./pipeline/time/mumbai-time";

const BUCKET_NAME = "model-images";
const SECONDARY_PREV_STATUS_REDIS_KEY = "secondary_prev_status";
const FRAMES = [8, 16, 24, 32, 40] as const;

interface ModelConfig {
  name: string;
  determiner: typeof urlDeterminer;
}

const MODELS: ModelConfig[] = [
  { name: "gfs", determiner: urlDeterminer },
  { name: "ecmwf", determiner: ecmwfUrlDeterminer },
];

export async function runSecondaryPipeline() {
  console.log("[secondary-pipeline] Emptying the pipeline.");
  try {
    await emptyBucket(BUCKET_NAME);
  } catch (error) {
    console.error("[secondary-pipeline] Failed to empty bucket.", error);
  }

  const date = new Date();
  const timestamp = date.toISOString();

  for (const model of MODELS) {
    for (const frame of FRAMES) {
      try {
        const url = await model.determiner(date, frame);
        console.log(
          `[secondary-pipeline] Fetching ${model.name} frame ${frame} from ${url}.`,
        );
        const imageBuffer = await fetchImageAsJpeg(url);
        const key = `${model.name}-${frame}-${timestamp}.jpeg`;
        await uploadToBucketWithKey(BUCKET_NAME, key, imageBuffer);
        console.log(`[secondary-pipeline] Uploaded ${key}.`);
      } catch (error) {
        console.error(
          `[secondary-pipeline] ${model.name} frame ${frame} failed. Continuing with remaining images.`,
          error,
        );
      }
    }
  }

  console.log("[secondary-pipeline] Collecting saved images for the agent.");
  const savedImages = await collectSecondarySavedImages();

  let prevStatus: string | null = null;
  try {
    const savedPrevStatus = await Bun.redis.get(
      SECONDARY_PREV_STATUS_REDIS_KEY,
    );
    prevStatus =
      typeof savedPrevStatus === "string" && savedPrevStatus.trim().length > 0
        ? savedPrevStatus
        : null;
  } catch (error) {
    console.error(
      "[secondary-pipeline] Failed to load previous secondary status. Continuing without it.",
      error,
    );
  }

  await secondaryAgent(savedImages, getMumbaiCurrentTimeText(), prevStatus);
}

// await runSecondaryPipeline();
