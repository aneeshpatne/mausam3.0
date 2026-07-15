import { expect, test } from "bun:test";
import { postAlert } from "./postAlert";

test("accepts a successful minimal alert-controller response", async () => {
  const response = await postAlert("green", async () =>
    Response.json({
      ok: true,
      soundMode: "silent",
      sameColor: true,
      ip: "192.168.0.50",
    }),
  );

  expect(response.ok).toBe(true);
  expect(response.mode).toBeUndefined();
});

test("rejects an alert-controller failure response", async () => {
  await expect(
    postAlert("red", async () => Response.json({ ok: false })),
  ).rejects.toThrow("Alert service reported failure");
});
