import {
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { client } from "../client/s3";

export async function deleteObjectsFromBucket(
  names: string[],
  bucketName: string,
): Promise<void> {
  if (names.length === 0) {
    return;
  }

  const batchSize = 1000;

  for (let index = 0; index < names.length; index += batchSize) {
    const batch = names.slice(index, index + batchSize);
    const result = await client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: batch.map((name) => ({ Key: name })),
            Quiet: false,
          },
        }),
    );
    if (result.Errors?.length) {
      throw new Error(
        `Failed to delete ${result.Errors.length} object(s) from ${bucketName}`,
      );
    }
    console.log(
      `[s3:delete] Deleted ${batch.length} object(s) from bucket ${bucketName}.`,
    );
  }
}
