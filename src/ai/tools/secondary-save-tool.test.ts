import { expect, test, spyOn } from "bun:test";
import { saveSecondaryStatus } from "./secondary-save-tool";

test("saves alert and summary to the secondary redis key", async () => {
  const setSpy = spyOn(Bun.redis, "set").mockImplementationOnce(async () => "OK");

  const result = await saveSecondaryStatus.invoke({
    alert: "orange",
    summary:
      "Wed Jul 9 12:00-18:00 IST hvy widespread peak 15-18h m=ECMWF,GFS low N Arabian Sea SW 25g40; Thu Jul 10 06:00-12:00 IST light sct m!=GFS wetter; Fri Jul 11 18:00-00:00 IST dry m=X ridge trnd: wet->dry",
  });

  expect(result).toBe("ok");
  expect(setSpy).toHaveBeenCalledTimes(1);
  expect(setSpy.mock.calls[0]?.[0]).toBe("secondary_prev_status");
  expect(setSpy.mock.calls[0]?.[1]).toBe(
    JSON.stringify({
      alert: "orange",
      summary:
        "Wed Jul 9 12:00-18:00 IST hvy widespread peak 15-18h m=ECMWF,GFS low N Arabian Sea SW 25g40; Thu Jul 10 06:00-12:00 IST light sct m!=GFS wetter; Fri Jul 11 18:00-00:00 IST dry m=X ridge trnd: wet->dry",
    }),
  );

  setSpy.mockRestore();
});
