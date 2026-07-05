import { PutObjectCommand } from "@aws-sdk/client-s3";
import { client } from "../client/s3";

export async function uploadToBucket(bucketName: string, imageBuffer: Buffer) {
  const date = new Date();
  const key = bucketName + "-" + date.toISOString() + ".jpeg";
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: imageBuffer,
      ContentType: "image/jpeg",
    }),
  );
}
