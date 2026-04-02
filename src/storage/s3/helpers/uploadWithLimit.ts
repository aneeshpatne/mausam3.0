import { PutObjectCommand } from "@aws-sdk/client-s3";
import { areBuffersSame } from "../../../data/radar/are-same";
import { fetchImage } from "../../../data/radar/get-image";
import { client } from "../client/s3";
import { ListObjectsFromBuckets } from "./ListObjects";

// bucketName: string, imageBuffer: Buffer
export async function UploadWithLimit(bucketName: string, imageBuffer: Buffer) {
  const bucket = await ListObjectsFromBuckets(bucketName);
  console.log(bucket.length);
  if (bucket.length > 0) {
    const last = bucket[bucket.length - 1];
    const url = process.env.R2_PUBLIC_BASE_URL + bucketName + "/" + last?.Key;
    const oldImageBuffer = await fetchImage(url);
    const result = areBuffersSame(imageBuffer, oldImageBuffer);
    if (result == true) return;
    const date = new Date();
    const Key = bucketName + "-" + date.toISOString() + ".jpeg";
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: Key,
        Body: imageBuffer,
        ContentType: "image/jpeg",
      }),
    );
  }
}
