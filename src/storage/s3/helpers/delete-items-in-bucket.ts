import { DeleteObjectCommand, S3ServiceException } from "@aws-sdk/client-s3";
import { client } from "../client/s3";

export async function deleteObjectFromBucket(
  name: string,
  bucketName: string,
): Promise<void> {
  try {
    await client.send(
      new DeleteObjectCommand({ Bucket: bucketName, Key: name }),
    );
    console.log(`Successfully Deleted ${name} from Bucket ${bucketName}`);
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
