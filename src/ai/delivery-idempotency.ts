const DELIVERY_TTL_SECONDS = 30 * 24 * 60 * 60;
const LOCK_TTL_MS = 10 * 60 * 1000;

export function createRunId(namespace: string, values: string[]): string {
  return `${namespace}-${Bun.hash(values.join("\u001f")).toString(16)}`;
}

export async function runDeliveryOnce<T>(
  runId: string,
  action: string,
  operation: () => Promise<T>,
): Promise<T | undefined> {
  const key = `mausam:delivery:${runId}:${action}`;
  const existing = await Bun.redis.get(key);
  if (existing === "done") return undefined;

  const acquired = await Bun.redis.send("SET", [
    key,
    "running",
    "NX",
    "PX",
    String(LOCK_TTL_MS),
  ]);
  if (acquired !== "OK") {
    throw new Error(`Delivery action already in progress: ${action}`);
  }

  try {
    const result = await operation();
    await Bun.redis.set(key, "done", "EX", DELIVERY_TTL_SECONDS);
    return result;
  } catch (error) {
    await Bun.redis.del(key);
    throw error;
  }
}
