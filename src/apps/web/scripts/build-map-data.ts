type OsmElement = { geometry?: { lat: number; lon: number }[]; tags?: Record<string, string> };

const source = await Bun.file("/tmp/mmr-osm-reference.json").json() as { elements: OsmElement[] };
const bounds = { west: 72.72, east: 73.24, south: 18.86, north: 19.32 };
const point = ({ lat, lon }: { lat: number; lon: number }) => {
  const x = ((lon - bounds.west) / (bounds.east - bounds.west)) * 900;
  const y = ((bounds.north - lat) / (bounds.north - bounds.south)) * 590;
  return `${x.toFixed(1)} ${y.toFixed(1)}`;
};
const build = (accept: (tags: Record<string, string>) => boolean, stride = 1) => source.elements
  .filter(element => element.geometry?.length && accept(element.tags ?? {}))
  .map(element => {
    const geometry = element.geometry!;
    const sampled = geometry.filter((_, index) => index === 0 || index === geometry.length - 1 || index % stride === 0);
    return `M${sampled.map(point).join("L")}`;
  }).join("");

const output = `// Generated once from OpenStreetMap data; no runtime map dependency.\n` +
  `// © OpenStreetMap contributors, ODbL 1.0 — https://www.openstreetmap.org/copyright\n` +
  `export const mmrMapPaths = ${JSON.stringify({
    motorway: build(tags => ["motorway", "trunk"].includes(tags.highway) && !tags.highway.endsWith("_link"), 2),
    primary: build(tags => tags.highway === "primary", 2),
    secondary: build(tags => tags.highway === "secondary", 3),
    rail: build(tags => tags.railway === "rail" && !tags.service, 2),
    water: build(tags => ["river", "canal"].includes(tags.waterway), 2),
    coast: build(tags => tags.natural === "coastline", 1),
  })} as const;\n`;

await Bun.write(new URL("../src/mmr-map-data.ts", import.meta.url), output);
console.log(`Wrote ${(output.length / 1024).toFixed(1)} KB of baked map geometry.`);
