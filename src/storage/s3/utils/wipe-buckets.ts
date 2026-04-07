import { images } from "../../../data/radar/radar-image";
import { deleteObjectsFromBucket } from "../helpers/delete-items-in-bucket";
import { listObjectsFromBuckets } from "../helpers/list-objects";

export async function WipeAllBuckets() {
  await Promise.all(
    images.map(async (image) => {
      try {
        const keys = (await listObjectsFromBuckets(image.bucketName))
          .map((item) => item.Key)
          .filter((key): key is string => key !== undefined);
        await deleteObjectsFromBucket(keys, image.bucketName);
      } catch (error) {
        console.error(`Failed to wipe bucket ${image.bucketName}`, error);
      }
    }),
  );
}

await WipeAllBuckets();
