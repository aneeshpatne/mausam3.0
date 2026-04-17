import axios from "axios";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { source } from "../source";

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type RainBlock = {
  rain: number | null;
  location: string;
};

type RainStats = {
  last15Min: RainBlock;
  last24Hour: RainBlock;
};

const firstNonEmpty = (...values: Array<string | undefined>) =>
  values.find((value) => (value ?? "").trim().length > 0)?.trim() ?? "N/A";

const textAt = (rows: cheerio.Cheerio<Element>, row: number, col: number) =>
  rows.eq(row).find("td").eq(col).text().trim();

const toIntOrNull = (value: string): number | null => {
  const normalized = value.replace(/,/g, "").trim();
  const match = normalized.match(/-?\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
};

async function fetchPageHtml() {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await axios.get(source, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; mausam-scraper/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      return response.data as string;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        console.warn(
          `Attempt ${attempt}/${MAX_RETRIES} failed. Retrying in ${RETRY_DELAY_MS}ms...`,
        );
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  throw lastError;
}

function parseRainStats($: cheerio.CheerioAPI): RainStats {
  const table = $("table.table.center").first();
  const rows = table.find("tbody tr");

  // --- 15 min data ---
  const last15MinRainText = firstNonEmpty(
    textAt(rows, 0, 0),
    textAt(rows, 0, 1),
    $("#max_15min_rain, #rain_15min").first().text(),
  );
  const last15MinLocation = firstNonEmpty(
    textAt(rows, 1, 0),
    textAt(rows, 1, 1),
    $("#max_15min_station, #station_15min").first().text(),
  );

  // --- 24 hour data ---
  const last24HourRainText = firstNonEmpty(
    $("#max_rain").text(),
    textAt(rows, 2, 0),
    textAt(rows, 2, 1),
  );
  const last24HourLocation = firstNonEmpty(
    $("#max_station").text(),
    textAt(rows, 3, 0),
    textAt(rows, 3, 1),
  );

  return {
    last15Min: {
      rain: toIntOrNull(last15MinRainText),
      location: last15MinLocation,
    },
    last24Hour: {
      rain: toIntOrNull(last24HourRainText),
      location: last24HourLocation,
    },
  };
}

export async function scrapeRainStats(): Promise<RainStats> {
  const html = await fetchPageHtml();
  const $ = cheerio.load(html);
  return parseRainStats($);
}
