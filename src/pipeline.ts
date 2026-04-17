import type { WeatherAgentMode } from "./ai/agents/weather-agent";
import { weatherAgent } from "./ai/agents/weather-agent";
import { getLocalWeatherSummary } from "./data/local/weather";
import { fetchImageAsJpeg } from "./data/radar/get-image";
import { images } from "./data/radar/radar-image";
import { getRain } from "./data/rain/getRain";
import { weatherStations } from "./data/rain/sources";
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
      "[pipeline] Morning mode active for IST 07:00 to 07:30. Wiping buckets.",
    );
    await wipeAllBuckets();
  }

  for (const imageObj of images) {
    console.log(`[pipeline] Fetching radar image from ${imageObj.url}.`);
    const imageBuffer = await fetchImageAsJpeg(imageObj.url);
    await uploadWithLimit(imageObj.bucketName, imageBuffer);
  }

  if (state.changed === false) {
    console.log("[pipeline] All images are unchanged. Skipping this run.");
    return;
  }
  console.log("[pipeline] Images changed. Proceeding with AI summarization.");
  const savedImages = await collectSavedImages();

  if (savedImages.length !== images.length) {
    throw new Error("Missing latest image for one or more weather sources");
  }
  const rainLines = await Promise.all(
    weatherStations.map(async (station) => {
      const rain = await getRain(station.station_id);
      return `For ${station.location} 15m: ${rain.last15Minutes}, 1h: ${rain.last1Hour}, 24h: ${rain.last24Hours}`;
    }),
  );
  let rainStatsLines: string[] = [];
  try {
    const rainStats = await scrapeRainStats();
    rainStatsLines = formatRainStatsLines(rainStats);
  } catch (error) {
    console.error(
      "[pipeline] Rain stats scrape failed. Continuing without rain stats.",
      error,
    );
  }
  const rain = [...rainLines, ...rainStatsLines].join("\n");
  const localStation = await getLocalWeatherSummary();
  console.log("[pipeline] Compiled rain context for agent.", { rain });
  await weatherAgent(
    savedImages,
    getMumbaiCurrentTimeText(),
    rain,
    localStation,
    pipelineMode,
  );
}
