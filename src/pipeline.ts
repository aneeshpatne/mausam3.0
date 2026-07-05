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
const PREV_STATUS_REDIS_KEY = "latest_prev_status";
const SECONDARY_PREV_STATUS_REDIS_KEY = "secondary_prev_status";

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

  const rainLineResults = await Promise.allSettled(
    weatherStations.map(async (station) => {
      const rain = await getRain(station.station_id);
      return `For ${station.location} 15m: ${rain.last15Minutes}, 1h: ${rain.last1Hour}, 24h: ${rain.last24Hours}`;
    }),
  );
  const rainLines = rainLineResults.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    const station = weatherStations[index];
    const stationLabel = station?.location ?? `station index ${index}`;
    console.error(
      `[pipeline] Rain fetch failed for ${stationLabel}. Continuing without this station.`,
      result.reason,
    );
    return [];
  });
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
  let prevStatus: string | null = null;
  try {
    const savedPrevStatus = await Bun.redis.get(PREV_STATUS_REDIS_KEY);
    prevStatus =
      typeof savedPrevStatus === "string" && savedPrevStatus.trim().length > 0
        ? savedPrevStatus
        : null;
  } catch (error) {
    console.error(
      "[pipeline] Failed to load previous weather status. Continuing without it.",
      error,
    );
  }
  let secondaryStatus: string | null = null;
  try {
    const savedSecondaryStatus = await Bun.redis.get(
      SECONDARY_PREV_STATUS_REDIS_KEY,
    );
    secondaryStatus =
      typeof savedSecondaryStatus === "string" &&
      savedSecondaryStatus.trim().length > 0
        ? savedSecondaryStatus
        : null;
  } catch (error) {
    console.error(
      "[pipeline] Failed to load secondary outlook. Continuing without it.",
      error,
    );
  }
  console.log("[pipeline] Compiled rain context for agent.", { rain });
  await weatherAgent(
    savedImages,
    getMumbaiCurrentTimeText(),
    rain,
    localStation,
    prevStatus,
    secondaryStatus,
    pipelineMode,
  );
}
