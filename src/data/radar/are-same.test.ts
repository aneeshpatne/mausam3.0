import { expect, test } from "bun:test";
import { areBuffersSame } from "./are-same";

test("compares only the visible bytes of buffer views", () => {
  const backing = Buffer.from("xradary");
  const view = backing.subarray(1, 6);
  expect(areBuffersSame(view, Buffer.from("radar"))).toBe(true);
  expect(areBuffersSame(view, Buffer.from("storm"))).toBe(false);
});
