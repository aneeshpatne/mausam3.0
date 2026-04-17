import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { client } from "../client/s3";

export async function deleteObjectFromBucket(
  name: string,
  bucketName: string,
): Promise<void> {
  try {
    await client.send(
      new DeleteObjectCommand({ Bucket: bucketName, Key: name }),
    );
    console.log(
      `[s3:delete] Deleted object ${name} from bucket ${bucketName}.`,
    );
  } catch (e) {
    if (e instanceof S3ServiceException) {
      console.error(
        `[s3:delete] Failed to delete object ${name} from bucket ${bucketName}. ${e.name}: ${e.message}`,
      );
    } else {
      throw e;
    }
  }
}

export async function deleteObjectsFromBucket(
  names: string[],
  bucketName: string,
): Promise<void> {
  if (names.length === 0) {
    return;
  }

  const batchSize = 1000;

  try {
    for (let index = 0; index < names.length; index += batchSize) {
      const batch = names.slice(index, index + batchSize);
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: batch.map((name) => ({ Key: name })),
            Quiet: false,
          },
        }),
      );
      console.log(
        `[s3:delete] Deleted ${batch.length} object(s) from bucket ${bucketName}.`,
      );
    }
  } catch (e) {
    if (e instanceof S3ServiceException) {
      console.error(
        `[s3:delete] Failed to delete objects from bucket ${bucketName}. ${e.name}: ${e.message}`,
      );
    } else {
      throw e;
    }
  }
}
