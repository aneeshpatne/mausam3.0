import { afterEach, expect, mock, spyOn, test } from "bun:test";
import * as z from "zod";
import { getOrCreateDecision } from "./decision-cache";

afterEach(() => mock.restore());

test("reuses a valid cached decision across delivery retries", async () => {
  spyOn(Bun.redis, "get").mockResolvedValueOnce(JSON.stringify({ alert: "yellow" }));
  let creates = 0;
  const decision = await getOrCreateDecision(
    "run",
    z.object({ alert: z.literal("yellow") }),
    async () => {
      creates += 1;
      return { alert: "yellow" as const };
    },
  );
  expect(decision).toEqual({ alert: "yellow" });
  expect(creates).toBe(0);
});
