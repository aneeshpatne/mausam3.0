import { afterEach, expect, test } from "bun:test";
import { getMailRecipients, getPublicBaseUrl, getRequiredEnv } from "./config";

const original = {
  TEST_REQUIRED_VALUE: process.env.TEST_REQUIRED_VALUE,
  MAIL_RECIPIENTS: process.env.MAIL_RECIPIENTS,
  R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
};

afterEach(() => {
  for (const [name, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test("rejects missing required configuration by variable name", () => {
  delete process.env.TEST_REQUIRED_VALUE;
  expect(() => getRequiredEnv("TEST_REQUIRED_VALUE")).toThrow(
    "Missing required environment variable: TEST_REQUIRED_VALUE",
  );
});

test("normalizes public URL and validates mail recipients", () => {
  process.env.R2_PUBLIC_BASE_URL = "https://images.example.com///";
  process.env.MAIL_RECIPIENTS = "one@example.com, two@example.com";
  expect(getPublicBaseUrl()).toBe("https://images.example.com/");
  expect(getMailRecipients()).toEqual(["one@example.com", "two@example.com"]);
});
