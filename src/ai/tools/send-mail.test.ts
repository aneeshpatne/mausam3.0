import { expect, test } from "bun:test";
import { buildMailTemplate } from "./send-mail";

test("escapes subjects and strips executable email HTML", () => {
  const result = buildMailTemplate(
    "Rain <script>alert(1)</script>",
    "yellow",
    '<p onclick="alert(1)">Update</p><script>alert(2)</script>',
  );
  expect(result).toContain("Rain &lt;script&gt;alert(1)&lt;/script&gt;");
  expect(result).not.toContain("onclick");
  expect(result).not.toContain("alert(2)");
});
