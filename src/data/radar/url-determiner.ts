const TROPICAL_TIDBITS_RUN_HOURS = [0, 6, 12, 18] as const;
const TROPICAL_TIDBITS_RUN_COOLDOWN_MS = 60 * 60 * 1000;
const TROPICAL_TIDBITS_FRAME = 2;
const TROPICAL_TIDBITS_REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  Referer: "https://www.example.com/analysis/models/",
};

type FetchLike = typeof fetch;
type TropicalTidbitsModel = "gfs" | "ecmwf";

interface TropicalTidbitsModelConfig {
  model: TropicalTidbitsModel;
  filePrefix: string;
}

const GFS_CONFIG: TropicalTidbitsModelConfig = {
  model: "gfs",
  filePrefix: "gfs_mslp_pcpn_india",
};

const ECMWF_CONFIG: TropicalTidbitsModelConfig = {
  model: "ecmwf",
  filePrefix: "ecmwf_mslp_pcpn_india",
};

function buildTropicalTidbitsUrl(
  config: TropicalTidbitsModelConfig,
  runId: string,
  frame = TROPICAL_TIDBITS_FRAME,
): string {
  return `https://www.example.com/analysis/models/${config.model}/${runId}/${config.filePrefix}_${frame}.png`;
}

function buildGfsUrl(runId: string, frame = TROPICAL_TIDBITS_FRAME): string {
  return buildTropicalTidbitsUrl(GFS_CONFIG, runId, frame);
}

function buildEcmwfUrl(runId: string, frame = TROPICAL_TIDBITS_FRAME): string {
  return buildTropicalTidbitsUrl(ECMWF_CONFIG, runId, frame);
}

function getLatestEligibleRunId(now: Date): string {
  const cutoff = new Date(now.getTime() - TROPICAL_TIDBITS_RUN_COOLDOWN_MS);

  for (let daysBack = 0; daysBack < 2; daysBack += 1) {
    const baseDate = new Date(
      Date.UTC(
        cutoff.getUTCFullYear(),
        cutoff.getUTCMonth(),
        cutoff.getUTCDate() - daysBack,
        0,
        0,
        0,
        0,
      ),
    );

    for (
      let index = TROPICAL_TIDBITS_RUN_HOURS.length - 1;
      index >= 0;
      index -= 1
    ) {
      const hour = TROPICAL_TIDBITS_RUN_HOURS[index];
      const run = new Date(baseDate.getTime());
      run.setUTCHours(hour, 0, 0, 0);

      if (run.getTime() <= cutoff.getTime()) {
        return formatRunId(run);
      }
    }
  }

  throw new Error("Unable to determine an eligible Tropical Tidbits run");
}

function getLatestEligibleGfsRunId(now: Date): string {
  return getLatestEligibleRunId(now);
}

function getPreviousRunId(runId: string): string {
  const year = Number(runId.slice(0, 4));
  const month = Number(runId.slice(4, 6)) - 1;
  const day = Number(runId.slice(6, 8));
  const hour = Number(runId.slice(8, 10));
  const run = new Date(Date.UTC(year, month, day, hour, 0, 0, 0));
  run.setUTCHours(run.getUTCHours() - 6);
  return formatRunId(run);
}

function formatRunId(run: Date): string {
  const year = String(run.getUTCFullYear());
  const month = String(run.getUTCMonth() + 1).padStart(2, "0");
  const day = String(run.getUTCDate()).padStart(2, "0");
  const hour = String(run.getUTCHours()).padStart(2, "0");
  return `${year}${month}${day}${hour}`;
}

async function assertAvailable(
  model: TropicalTidbitsModel,
  url: string,
  fetchImpl: FetchLike,
): Promise<void> {
  const response = await fetchImpl(url, {
    method: "GET",
    headers: TROPICAL_TIDBITS_REQUEST_HEADERS,
  });

  if (response.status === 404) {
    throw new Error("404");
  }

  if (!response.ok) {
    throw new Error(
      `${model.toUpperCase()} image probe failed with status ${response.status}`,
    );
  }
}

async function determineTropicalTidbitsUrl(
  config: TropicalTidbitsModelConfig,
  now: Date = new Date(),
  frame = TROPICAL_TIDBITS_FRAME,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  const latestRunId = getLatestEligibleRunId(now);
  const latestUrl = buildTropicalTidbitsUrl(config, latestRunId, frame);

  try {
    await assertAvailable(config.model, latestUrl, fetchImpl);
    return latestUrl;
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "404") {
      throw error;
    }
  }

  const previousUrl = buildTropicalTidbitsUrl(
    config,
    getPreviousRunId(latestRunId),
    frame,
  );
  await assertAvailable(config.model, previousUrl, fetchImpl);
  return previousUrl;
}

export async function urlDeterminer(
  now: Date = new Date(),
  frame = TROPICAL_TIDBITS_FRAME,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  return determineTropicalTidbitsUrl(GFS_CONFIG, now, frame, fetchImpl);
}

export async function ecmwfUrlDeterminer(
  now: Date = new Date(),
  frame = TROPICAL_TIDBITS_FRAME,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  return determineTropicalTidbitsUrl(ECMWF_CONFIG, now, frame, fetchImpl);
}

export { buildEcmwfUrl, buildGfsUrl, getLatestEligibleGfsRunId };
