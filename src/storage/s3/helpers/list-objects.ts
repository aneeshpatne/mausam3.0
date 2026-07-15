import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import type { _Object } from "@aws-sdk/client-s3";
import { client } from "../client/s3";

export interface ObjectStats {
  last: _Object | undefined;
  first: _Object | undefined;
}

export async function listObjectsFromBuckets(bucket: string): Promise<_Object[]> {
  const contents: _Object[] = [];
  let continuationToken: string | undefined;

  do {
    const { Contents = [], IsTruncated, NextContinuationToken } = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken }),
    );
    contents.push(...Contents);
    continuationToken = IsTruncated ? NextContinuationToken : undefined;
  } while (continuationToken);

  return contents.sort((a, b) => {
    const dateA = a.LastModified ? new Date(a.LastModified).getTime() : 0;
    const dateB = b.LastModified ? new Date(b.LastModified).getTime() : 0;
    return dateA - dateB;
  });
}

export async function findLatestObjectStatsFromBucket(
  bucket: string,
): Promise<ObjectStats | undefined> {
  const contents = await listObjectsFromBuckets(bucket);
  const sorted = contents.sort((a, b) => {
    const dateA = a.LastModified ? new Date(a.LastModified).getTime() : 0;
    const dateB = b.LastModified ? new Date(b.LastModified).getTime() : 0;
    return dateB - dateA;
  });
  return { last: sorted[0], first: sorted[sorted.length - 1] };
}
