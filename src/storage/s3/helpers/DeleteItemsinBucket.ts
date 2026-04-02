import { DeleteObjectCommand, S3ServiceException } from "@aws-sdk/client-s3";
import { client } from "../client/s3";

export async function DeleteObjectFromBucket(
  name: string,
  bucket_name: string,
) {
  try {
    const response = await client.send(
      new DeleteObjectCommand({ Bucket: bucket_name, Key: name }),
    );
  } catch (e) {
    if (e instanceof S3ServiceException) {
      console.error(
        `Error from S3 while listing buckets.  ${e.name}: ${e.message}`,
      );
    } else {
      throw e;
    }
  }
}
