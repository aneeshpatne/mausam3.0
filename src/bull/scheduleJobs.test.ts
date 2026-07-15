import { expect, test } from "bun:test";
import { isWithinActiveHours } from "./active-hours";

test("evaluates active hours in Mumbai and rejects next-day targets", () => {
  const sevenAmIst = new Date("2026-07-14T01:30:00.000Z");
  expect(isWithinActiveHours(15 * 60 * 60 * 1000, sevenAmIst)).toBe(true);
  expect(isWithinActiveHours(16 * 60 * 60 * 1000, sevenAmIst)).toBe(false);
  expect(isWithinActiveHours(18 * 60 * 60 * 1000, sevenAmIst)).toBe(false);
});
