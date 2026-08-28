import { expect, test } from "bun:test";
import { weatherPayloadSchema } from "./weather";

test("accepts the station's current split weather and rain alerts", () => {
  const weather = weatherPayloadSchema.parse({
    ok: true,
    temp_c: 30,
    pressure_hpa: 1006.157,
    humidity_pct: 81.6,
    light_lux: 5,
    weatherAlert: "green",
    rainAlert: "green",
    ip: "192.168.0.50",
  });

  expect(weather.temp_c).toBe(30);
  expect(weather.weatherAlert).toBe("green");
  expect(weather.rainAlert).toBe("green");
});

test("remains compatible with the previous single-alert response", () => {
  const weather = weatherPayloadSchema.parse({
    ok: true,
    temp_c: 29,
    pressure_hpa: 1005,
    humidity_pct: 80,
    light_lux: 20,
    alert: "yellow",
    ip: "192.168.0.50",
  });

  expect(weather.weatherAlert).toBe("yellow");
  expect(weather.rainAlert).toBe("yellow");
});
