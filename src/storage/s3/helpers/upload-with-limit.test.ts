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

test("retains the previous image and deletes only older history", async () => {
  const events: string[] = [];
  let deletedKeys: string[] = [];
  const changed = await uploadWithLimit("radar", Buffer.from("new"), dependencies({
    listObjects: async () => [
      { Key: "oldest.jpeg", LastModified: new Date(1) },
      { Key: "previous.jpeg", LastModified: new Date(2) },
    ],
    put: async () => { events.push("put"); },
    deleteObjects: async (keys: string[]) => {
      events.push("delete");
      deletedKeys = keys;
    },
  }));
  expect(changed).toBe(true);
  expect(events).toEqual(["put", "delete"]);
  expect(deletedKeys).toEqual(["oldest.jpeg"]);
});

test("keeps the only existing image when uploading its replacement", async () => {
  let deletedKeys: string[] = [];
  await uploadWithLimit("radar", Buffer.from("new"), dependencies({
    deleteObjects: async (keys: string[]) => { deletedKeys = keys; },
  }));
  expect(deletedKeys).toEqual([]);
});

test("does not delete old data when replacement upload fails", async () => {
  let deletes = 0;
  await expect(uploadWithLimit("radar", Buffer.from("new"), dependencies({
    put: async () => { throw new Error("put failed"); },
    deleteObjects: async () => { deletes += 1; },
  }))).rejects.toThrow("put failed");
  expect(deletes).toBe(0);
});
