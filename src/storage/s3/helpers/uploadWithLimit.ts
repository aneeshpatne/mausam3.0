import { client } from "../client/s3";
import { ListBuckets } from "./ListBuckets";
import { ListObjectsFromBuckets } from "./ListObjects";

// bucketName: string, imageBuffer: Buffer
export async function UploadWithLimit() {
  const bucket = await ListObjectsFromBuckets("radar-max-z");
  console.log(bucket.length);
  if (bucket.length > 0) {
    const first = bucket[0];
    const last = bucket[bucket.length - 1];
  }
}

await UploadWithLimit();
