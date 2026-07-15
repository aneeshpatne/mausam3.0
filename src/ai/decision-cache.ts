import type * as z from "zod";

const DECISION_TTL_SECONDS = 30 * 24 * 60 * 60;

export async function getOrCreateDecision<T>(
  runId: string,
  schema: z.ZodType<T>,
  create: () => Promise<T>,
): Promise<T> {
  const key = `mausam:decision:${runId}`;
  const cached = await Bun.redis.get(key);
  if (cached) {
    const parsed = schema.safeParse(JSON.parse(cached));
    if (parsed.success) return parsed.data;
  }
  const decision = schema.parse(await create());
  await Bun.redis.set(
    key,
    JSON.stringify(decision),
    "EX",
    DECISION_TTL_SECONDS,
  );
  return decision;
}
