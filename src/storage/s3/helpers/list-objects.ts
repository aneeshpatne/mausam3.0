import { ListObjectsV2Command, S3ServiceException } from "@aws-sdk/client-s3";
import type { _Object } from "@aws-sdk/client-s3";
import { client } from "../client/s3";

export interface ObjectStats {
  last: _Object | undefined;
  first: _Object | undefined;
}

export async function listObjectsFromBuckets(bucket: string): Promise<_Object[]> {
  try {
    const { Contents = [] } = await client.send(
      new ListObjectsV2Command({ Bucket: bucket }),
    );
    const sorted = Contents.sort((a, b) => {
      const dateA = a.LastModified ? new Date(a.LastModified).getTime() : 0;
      const dateB = b.LastModified ? new Date(b.LastModified).getTime() : 0;
      return dateA - dateB;
    });
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

export async function findLatestObjectStatsFromBucket(
  bucket: string,
): Promise<ObjectStats | undefined> {
  try {
    const { Contents = [] } = await client.send(
      new ListObjectsV2Command({ Bucket: bucket }),
    );

    const sorted = Contents.sort((a, b) => {
      const dateA = a.LastModified ? new Date(a.LastModified).getTime() : 0;
      const dateB = b.LastModified ? new Date(b.LastModified).getTime() : 0;
      return dateB - dateA;
    });
    return { last: sorted[0], first: sorted[sorted.length - 1] };
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
