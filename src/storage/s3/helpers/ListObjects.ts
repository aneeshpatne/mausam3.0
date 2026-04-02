import { ListObjectsV2Command, S3ServiceException } from "@aws-sdk/client-s3";
import { client } from "../client/s3";
export async function ListObjectsFromBuckets(bucket: string) {
  try {
    const res = await client.send(new ListObjectsV2Command({ Bucket: bucket }));
    console.log(res?.Contents);
  } catch (e) {
    if (e instanceof S3ServiceException) {
      console.error(
        `Error from S3 while listing objects.  ${e.name}: ${e.message}`,
      );
    } else {
      throw e;
    }
  }
}

export async function FindLatestObjectFromBucket(bucket: string) {
  try {
    const { Contents = [] } = await client.send(
      new ListObjectsV2Command({ Bucket: bucket }),
    );

    const latest = Contents.sort(
      (a, b) =>
        new Date(b.LastModified!).getTime() -
        new Date(a.LastModified!).getTime(),
    )[0];
    console.log(latest);
  } catch (e) {
    if (e instanceof S3ServiceException) {
      console.error(
        `Error from S3 while listing Objects.  ${e.name}: ${e.message}`,
      );
    } else {
      throw e;
    }
  }
}

await FindLatestObjectFromBucket();
