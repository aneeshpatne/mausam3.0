import { ListBucketsCommand, S3ServiceException } from "@aws-sdk/client-s3";
import { client } from "../client/s3";
export async function ListBuckets() {
  try {
    const res = await client.send(new ListBucketsCommand({}));
    console.log(res.Buckets);
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
