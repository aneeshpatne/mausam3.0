import { emptyBucket } from "./storage/s3/helpers/delete-items-in-bucket";

export async function runSecondaryPipeline() {
  console.log("[secondary-pipeline] Emptying the pipeline.");
  try {
    await emptyBucket("model-images");
  } catch (error) {
    console.error("[secondary-pipeline] Failed to empty bucket.", error);
  }
}
