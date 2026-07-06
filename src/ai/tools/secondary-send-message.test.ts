import { expect, test } from "bun:test";
import { splitDiscordMessage } from "./secondary-send-message";

test("splits long secondary Discord messages below the chunk limit", () => {
  const message = ["first line", "a".repeat(25), "second line"].join("\n");

  const chunks = splitDiscordMessage(message, 20);

  expect(chunks).toEqual([
    "first line",
    "aaaaaaaaaaaaaaaaaaaa",
    "aaaaa",
    "second line",
  ]);
});

test("preserves short secondary Discord messages as one chunk", () => {
  const chunks = splitDiscordMessage("technical outlook", 20);

  expect(chunks).toEqual(["technical outlook"]);
});
