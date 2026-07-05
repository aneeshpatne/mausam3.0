import { PutObjectCommand } from "@aws-sdk/client-s3";
import { client } from "../client/s3";

export async function uploadToBucketWithKey(
  bucketName: string,
  key: string,
  imageBuffer: Buffer,
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: imageBuffer,
      ContentType: "image/jpeg",
    }),
  );
}
