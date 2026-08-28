import { readSiteData } from "../../../storage/weather-db";

const target = new URL("../src/generated/site-data.json", import.meta.url);
await Bun.write(target, `${JSON.stringify(readSiteData(), null, 2)}\n`);
console.log(`[web] Wrote build-time weather snapshot to ${target.pathname}`);
