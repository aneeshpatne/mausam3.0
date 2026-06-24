import type { WeatherAgentMode } from "./ai/agents/weather-agent";
import { weatherAgent } from "./ai/agents/weather-agent";
import { getLocalWeatherSummary } from "./data/local/weather";
import { images } from "./data/radar/radar-image";
import { getRain } from "./data/rain/getRain";
import { weatherStations } from "./data/rain/sources";
import { collectSavedImages } from "./pipeline/helpers/saved-images";
import { ingestWeatherImages } from "./pipeline/helpers/ingest-weather-images";
import { state } from "./pipeline/interfaces/pipeline-state";
import {
  getMumbaiCurrentTimeText,
  getMumbaiNowParts,
} from "./pipeline/time/mumbai-time";
import {
  formatRainStatsLines,
  scrapeRainStats,
} from "./scrape/rainStats/rainStats";
import { scheduleJob } from "./bull/scheduleJobs";
import { wipeAllBuckets } from "./storage/s3/utils/wipe-buckets";

const UNCHANGED_IMAGES_RETRY_DELAY_MS = 30 * 60 * 1000;

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

  await ingestWeatherImages(images);

  if (state.changed === false) {
    console.log("[pipeline] All images are unchanged. Skipping this run.");
    try {
      await scheduleJob(UNCHANGED_IMAGES_RETRY_DELAY_MS);
    } catch (err) {
      console.error(
        "[pipeline] Failed to schedule retry after unchanged images.",
        err,
      );
    }
    return;
  }
  console.log("[pipeline] Images changed. Proceeding with AI summarization.");
  const savedImages = await collectSavedImages();

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
