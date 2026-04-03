import { fetchImageAsJpeg } from "./data/radar/get-image";
import { images } from "./data/radar/radar-image";
import { UploadWithLimit } from "./storage/s3/helpers/uploadWithLimit";

export const state = {
  changed: false,
};

export async function runPipeline() {
  for (const image_obj of images) {
    console.log(image_obj.url);
    const imageBuffer = await fetchImageAsJpeg(image_obj.url);
    await UploadWithLimit(image_obj.bucket_name, imageBuffer);
  }

  if (state.changed === false) {
    console.log("All images are same, skipping this attempt");
    return;
  }
  console.log("Images have changed proceeding with AI summarization");
}

await runPipeline();
