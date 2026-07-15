import { secondaryAgent } from "./ai/agents/secondary-agent";
import { fetchImageAsJpeg } from "./data/radar/get-image";
import { determineEcmwfUrls, determineGfsUrls } from "./data/radar/url-determiner";
import { collectSecondarySavedImages } from "./pipeline/helpers/secondary-saved-images";
import { getMumbaiCurrentTimeText } from "./pipeline/time/mumbai-time";
import { deleteObjectsFromBucket } from "./storage/s3/helpers/delete-items-in-bucket";
import { listObjectsFromBuckets } from "./storage/s3/helpers/list-objects";
import { uploadToBucketWithKey } from "./storage/s3/helpers/upload";

const BUCKET_NAME = "model-images";
const SECONDARY_PREV_STATUS_REDIS_KEY = "secondary_prev_status";
const FRAMES = [8, 16, 24, 32, 40] as const;
const MODELS = [
  { name: "gfs", determineUrls: determineGfsUrls },
  { name: "ecmwf", determineUrls: determineEcmwfUrls },
] as const;

export async function runSecondaryPipeline(): Promise<void> {
  const date = new Date();
  const modelRuns = await Promise.all(
    MODELS.map(async (model) => ({
      model,
      urls: await model.determineUrls(date, FRAMES),
    })),
  );
  const sourceUrls = modelRuns.flatMap(({ urls }) => [...urls.values()]);
  const runPrefix = `run-${Bun.hash(sourceUrls.join("\u001f")).toString(16)}`;
  const stagedKeys: string[] = [];

  try {
    for (const { model, urls } of modelRuns) {
      for (const frame of FRAMES) {
        const url = urls.get(frame);
        if (!url) throw new Error(`Missing ${model.name} frame ${frame} URL`);
        const imageBuffer = await fetchImageAsJpeg(url);
        const key = `${runPrefix}/${model.name}-${frame}.jpeg`;
        await uploadToBucketWithKey(BUCKET_NAME, key, imageBuffer);
        stagedKeys.push(key);
      }
    }
  } catch (error) {
    if (stagedKeys.length > 0) {
      try {
        await deleteObjectsFromBucket(stagedKeys, BUCKET_NAME);
      } catch (cleanupError) {
        console.error("[secondary-pipeline] Failed to clean staged images.", cleanupError);
      }
    }
    throw error;
  }

  if (stagedKeys.length !== MODELS.length * FRAMES.length) {
    throw new Error(`Secondary image set incomplete: ${stagedKeys.length}/10`);
  }
  const oldKeys = (await listObjectsFromBuckets(BUCKET_NAME))
    .flatMap(({ Key }) => (Key && !stagedKeys.includes(Key) ? [Key] : []));
  await deleteObjectsFromBucket(oldKeys, BUCKET_NAME);

  const savedImages = await collectSecondarySavedImages();
  let prevStatus: string | null = null;
  try {
    const saved = await Bun.redis.get(SECONDARY_PREV_STATUS_REDIS_KEY);
    prevStatus = typeof saved === "string" && saved.trim() ? saved : null;
  } catch (error) {
    console.error("[secondary-pipeline] Failed to load previous status.", error);
  }
  await secondaryAgent(savedImages, getMumbaiCurrentTimeText(), prevStatus);
}
