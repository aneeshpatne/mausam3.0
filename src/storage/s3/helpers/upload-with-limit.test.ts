import { expect, test } from "bun:test";
import { uploadWithLimit } from "./upload-with-limit";

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    listObjects: async () => [{ Key: "old.jpeg", LastModified: new Date(1) }],
    fetchExisting: async () => Buffer.from("old"),
    areSame: () => false,
    put: async () => {},
    deleteObjects: async () => {},
    publicBaseUrl: () => "https://example.com/",
    now: () => new Date("2026-07-14T00:00:00.000Z"),
    ...overrides,
  };
}

test("reports unchanged only when comparison succeeds", async () => {
  let puts = 0;
  const changed = await uploadWithLimit("radar", Buffer.from("new"), dependencies({
    areSame: () => true,
    put: async () => { puts += 1; },
  }));
  expect(changed).toBe(false);
  expect(puts).toBe(0);
});

test("uses the exact bucket and object key in the public URL", async () => {
  let fetchedUrl = "";
  await uploadWithLimit(
    "radar",
    Buffer.from("new"),
    dependencies({
      listObjects: async () => [
        { Key: "radar-2026-07-14T00:00:00.000Z.jpeg" },
      ],
      fetchExisting: async (url: string) => {
        fetchedUrl = url;
        return Buffer.from("old");
      },
    }),
  );
  expect(fetchedUrl).toBe(
    "https://example.com/radar/radar-2026-07-14T00:00:00.000Z.jpeg",
  );
});

test("deletes the previous object only after a successful replacement", async () => {
  const events: string[] = [];
  const changed = await uploadWithLimit("radar", Buffer.from("new"), dependencies({
    put: async () => { events.push("put"); },
    deleteObjects: async () => { events.push("delete"); },
  }));
  expect(changed).toBe(true);
  expect(events).toEqual(["put", "delete"]);
});

test("does not delete old data when replacement upload fails", async () => {
  let deletes = 0;
  await expect(uploadWithLimit("radar", Buffer.from("new"), dependencies({
    put: async () => { throw new Error("put failed"); },
    deleteObjects: async () => { deletes += 1; },
  }))).rejects.toThrow("put failed");
  expect(deletes).toBe(0);
});
