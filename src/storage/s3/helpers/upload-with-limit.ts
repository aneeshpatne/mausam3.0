import { PutObjectCommand } from "@aws-sdk/client-s3";
import { areImagesVisuallySame } from "../../../data/radar/are-same";
import { fetchImage } from "../../../data/radar/get-image";
import { client } from "../client/s3";
import { listObjectsFromBuckets } from "./list-objects";
import { deleteObjectsFromBucket } from "./delete-items-in-bucket";
import { getPublicBaseUrl } from "../../../config";

interface UploadDependencies {
  listObjects: typeof listObjectsFromBuckets;
  fetchExisting: typeof fetchImage;
  areSame: (a: Buffer, b: Buffer) => boolean | Promise<boolean>;
  put: (bucketName: string, key: string, imageBuffer: Buffer) => Promise<void>;
  deleteObjects: typeof deleteObjectsFromBucket;
  publicBaseUrl: () => string;
  now: () => Date;
}

const defaultDependencies: UploadDependencies = {
  listObjects: listObjectsFromBuckets,
  fetchExisting: fetchImage,
  areSame: areImagesVisuallySame,
  put: async (bucketName, key, imageBuffer) => {
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: imageBuffer,
        ContentType: "image/jpeg",
      }),
    );
  },
  deleteObjects: deleteObjectsFromBucket,
  publicBaseUrl: getPublicBaseUrl,
  now: () => new Date(),
};

export async function uploadWithLimit(
  bucketName: string,
  imageBuffer: Buffer,
  dependencies: UploadDependencies = defaultDependencies,
): Promise<boolean> {
  const date = dependencies.now();
  const key = bucketName + "-" + date.toISOString() + ".jpeg";
  const bucket = await dependencies.listObjects(bucketName);
  console.log(
    `[s3:upload] Bucket ${bucketName} currently has ${bucket.length} object(s).`,
  );
  if (bucket.length > 0) {
    const last = bucket[bucket.length - 1];
    const url = `${dependencies.publicBaseUrl()}${bucketName}/${last?.Key ?? ""}`;
    const oldImageBuffer = await dependencies.fetchExisting(url);
    const result = await dependencies.areSame(imageBuffer, oldImageBuffer);
    if (result === true) {
      console.log(`[s3:upload] ${bucketName} image unchanged. Skipping upload.`);
      return false;
    }
    console.log(`[s3:upload] ${bucketName} image changed. Uploading new image.`);
    await dependencies.put(bucketName, key, imageBuffer);
    const toBeDeleted = bucket
      .slice(0)
      .map((item) => item.Key)
      .filter((key): key is string => key !== undefined);
    await dependencies.deleteObjects(toBeDeleted, bucketName);
    return true;
  } else {
    await dependencies.put(bucketName, key, imageBuffer);
    return true;
  }
}
