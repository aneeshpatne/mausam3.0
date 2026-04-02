import { ListObjectsV2Command, S3ServiceException } from "@aws-sdk/client-s3";
import { client } from "../client/s3";
export async function ListObjectsFromBuckets() {
  try {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: "radar-max-z" }),
    );
    console.log(res?.Contents);
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

await ListObjectsFromBuckets();
