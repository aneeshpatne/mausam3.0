import { fetchImageAsJpeg } from "./data/radar/get-image";
import { images } from "./data/radar/radar-image";
import { ListObjectsFromBuckets } from "./storage/s3/helpers/ListObjects";
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
  const saved_images = (
    await Promise.all(
      images.map(async (image_obj) => {
        const keys = (await ListObjectsFromBuckets(image_obj.bucket_name))
          .map((item) => item.Key)
          .filter((key): key is string => key !== undefined);

        return keys.map(
          (key) =>
            `${process.env.R2_PUBLIC_BASE_URL}${image_obj.bucket_name}/${key}`,
        );
      }),
    )
  ).flat();
  console.log(saved_images);
}

await runPipeline();
