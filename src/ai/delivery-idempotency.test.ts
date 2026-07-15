import { afterEach, expect, mock, spyOn, test } from "bun:test";
import { runDeliveryOnce } from "./delivery-idempotency";

afterEach(() => {
  mock.restore();
});

test("skips delivery actions already marked done", async () => {
  spyOn(Bun.redis, "get").mockResolvedValueOnce("done");
  let calls = 0;
  const result = await runDeliveryOnce("run", "email", async () => {
    calls += 1;
    return "sent";
  });
  expect(result).toBeUndefined();
  expect(calls).toBe(0);
});

test("clears its lock when a delivery action fails", async () => {
  spyOn(Bun.redis, "get").mockResolvedValueOnce(null);
  spyOn(Bun.redis, "send").mockResolvedValueOnce("OK");
  const del = spyOn(Bun.redis, "del").mockResolvedValueOnce(1);
  await expect(
    runDeliveryOnce("run", "email", async () => {
      throw new Error("delivery failed");
    }),
  ).rejects.toThrow("delivery failed");
  expect(del).toHaveBeenCalledTimes(1);
});
