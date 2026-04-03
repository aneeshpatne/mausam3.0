import { PutObjectCommand } from "@aws-sdk/client-s3";
import { areBuffersSame } from "../../../data/radar/are-same";
import { fetchImage } from "../../../data/radar/get-image";
import { client } from "../client/s3";
import { listObjectsFromBuckets } from "./list-objects";
import { deleteObjectFromBucket } from "./delete-items-in-bucket";
import { state } from "../../../pipeline";

export async function uploadWithLimit(
  bucketName: string,
  imageBuffer: Buffer,
): Promise<void> {
  const date = new Date();
  const key = bucketName + "-" + date.toISOString() + ".jpeg";
  const bucket = await listObjectsFromBuckets(bucketName);
  console.log(bucket.length);
  if (bucket.length > 0) {
    const last = bucket[bucket.length - 1];
    const url = process.env.R2_PUBLIC_BASE_URL + bucketName + "/" + last?.Key;
    const oldImageBuffer = await fetchImage(url);
    const result = areBuffersSame(imageBuffer, oldImageBuffer);
    if (result === true) {
      console.log(`${bucketName} Image has not changed, skipping`);
      return;
    }
    state.changed = true;
    console.log(`${bucketName} Image has changed, uploading.`);
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: imageBuffer,
        ContentType: "image/jpeg",
      }),
    );
    const toBeDeleted = bucket
      .slice(0, -2)
      .map((item) => item.Key)
      .filter((key): key is string => key !== undefined);
    for (const itemKey of toBeDeleted) {
      deleteObjectFromBucket(itemKey, bucketName);
    }
  } else {
    state.changed = true;
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: imageBuffer,
        ContentType: "image/jpeg",
      }),
    );
  }
}
