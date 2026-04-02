import { fetchImageAsJpeg } from "./data/radar/get-image";
import { images } from "./data/radar/radar-image";
import { UploadWithLimit } from "./storage/s3/helpers/uploadWithLimit";

for (const image_obj of images) {
  console.log(image_obj.url);
  const imageBuffer = await fetchImageAsJpeg(image_obj.url);
  await UploadWithLimit(image_obj.bucket_name, imageBuffer);
}
