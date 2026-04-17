import type { WeatherAgentMode } from "./ai/agents/weather-agent";
import { weatherAgent } from "./ai/agents/weather-agent";
import { fetchImageAsJpeg } from "./data/radar/get-image";
import { images } from "./data/radar/radar-image";
import { getRain } from "./data/rain/getRain";
import { weatherStations } from "./data/rain/weatherStations";
import { collectSavedImages } from "./pipeline/helpers/saved-images";
import type { PipelineState } from "./pipeline/interfaces/pipeline-state";
import {
  getMumbaiCurrentTimeText,
  getMumbaiNowParts,
} from "./pipeline/time/mumbai-time";
import {
  formatRainStatsLines,
  scrapeRainStats,
} from "./scrape/rainStats/rainStats";
import { uploadWithLimit } from "./storage/s3/helpers/upload-with-limit";
import { wipeAllBuckets } from "./storage/s3/utils/wipe-buckets";

export const state: PipelineState = {
  changed: false,
};

function getPipelineMode(date: Date = new Date()): WeatherAgentMode {
  const { hour, minute } = getMumbaiNowParts(date);

  if (hour === 7 && minute <= 30) {
    return "morning";
  }

  return "default";
}

export async function runPipeline(): Promise<void> {
  state.changed = false;
  const pipelineMode = getPipelineMode();

  if (pipelineMode === "morning") {
    console.log(
      "Morning mode active for IST 7:00 AM to 7:30 AM. Wiping buckets.",
    );
    await wipeAllBuckets();
  }

  for (const imageObj of images) {
    console.log(imageObj.url);
    const imageBuffer = await fetchImageAsJpeg(imageObj.url);
    await uploadWithLimit(imageObj.bucketName, imageBuffer);
  }

  if (state.changed === false) {
    console.log("All images are same, skipping this attempt");
    return;
  }
  console.log("Images have changed proceeding with AI summarization");
  const savedImages = await collectSavedImages();

  if (savedImages.length !== images.length) {
    throw new Error("Missing latest image for one or more weather sources");
  }
  const rainLines = await Promise.all(
    weatherStations.map(async (station) => {
      const rain = await getRain(station.id);
      return `For ${station.location} 15m: ${rain.last15Minutes}, 1h: ${rain.last1Hour}, 24h: ${rain.last24Hours}`;
    }),
  );
  let rainStatsLines: string[] = [];
  try {
    const rainStats = await scrapeRainStats();
    rainStatsLines = formatRainStatsLines(rainStats);
  } catch (error) {
    console.warn("rainStats scrape failed, continuing pipeline:", error);
  }
  const rain = [...rainLines, ...rainStatsLines].join("\n");
  console.log(rain);
  await weatherAgent(
    savedImages,
    getMumbaiCurrentTimeText(),
    rain,
    pipelineMode,
  );
}
