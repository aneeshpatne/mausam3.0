import { fetchImageAsJpeg } from "./get-image";
import { images } from "./radar-image";

for (const image_obj of images) {
  console.log(image_obj.url);
  console.log(await fetchImageAsJpeg(image_obj.url));
}
