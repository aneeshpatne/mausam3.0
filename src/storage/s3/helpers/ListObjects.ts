import { ListObjectsV2Command, S3ServiceException } from "@aws-sdk/client-s3";
import { client } from "../client/s3";
export async function ListObjectsFromBuckets(bucket: string) {
  try {
    const { Contents = [] } = await client.send(
      new ListObjectsV2Command({ Bucket: bucket }),
    );
    const sorted = Contents.sort(
      (a, b) =>
        new Date(b.LastModified!).getTime() -
        new Date(a.LastModified!).getTime(),
    );
    return sorted;
  } catch (e) {
    if (e instanceof S3ServiceException) {
      console.error(
        `Error from S3 while listing objects.  ${e.name}: ${e.message}`,
      );
      return [];
    } else {
      throw e;
    }
  }
}

export async function FindLatestObjectStatsFromBucket(bucket: string) {
  try {
    const { Contents = [] } = await client.send(
      new ListObjectsV2Command({ Bucket: bucket }),
    );

    const sorted = Contents.sort(
      (a, b) =>
        new Date(b.LastModified!).getTime() -
        new Date(a.LastModified!).getTime(),
    );
    return { last: sorted[0], first: sorted[-1] };
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
