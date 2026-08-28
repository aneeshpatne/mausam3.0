import { Database } from "bun:sqlite";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

export type AlertLevel = "green" | "yellow" | "orange" | "red";

export interface PrimaryReport {
  alert: AlertLevel;
  headline: string;
  summary: string;
  analysedAt: string;
  rainChance: number;
  expectedPeak: string;
  confidence: "Low" | "Medium" | "High";
  agentNote: string;
  temperatureC: number | null;
  feelsLikeC: number | null;
  wind: string | null;
  rainRate: string | null;
  station: string | null;
  stationUpdatedAt: string | null;
  sourceSummary: string;
}

export interface ForecastDay {
  date: string;
  label: string;
  rain: string;
  chance: number | null;
  rainfall: string;
  alert: AlertLevel;
}

export interface OutlookReport {
  alert: AlertLevel;
  headline: string;
  modelRead: string;
  reasoning: string;
  analysedAt: string;
  days: ForecastDay[];
}

export interface AgentRun {
  agent: "Nowcast" | "Outlook";
  analysedAt: string;
  note: string;
  alert: AlertLevel;
}

export interface SiteData {
  primary: PrimaryReport | null;
  outlook: OutlookReport | null;
  runs: AgentRun[];
  generatedAt: string;
}

const DEFAULT_DB_PATH = resolve(import.meta.dir, "../../data/mausam.sqlite");

export function getWeatherDb(path = process.env.MAUSAM_DB_PATH ?? DEFAULT_DB_PATH) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { create: true });
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent TEXT NOT NULL CHECK(agent IN ('Nowcast', 'Outlook')),
      alert TEXT NOT NULL CHECK(alert IN ('green', 'yellow', 'orange', 'red')),
      analysed_at TEXT NOT NULL,
      note TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS agent_reports_latest
      ON agent_reports(agent, analysed_at DESC, id DESC);
  `);
  return db;
}

export function savePrimaryReport(report: PrimaryReport, path?: string) {
  using db = getWeatherDb(path);
  db.query(`INSERT INTO agent_reports (agent, alert, analysed_at, note, payload_json)
    VALUES ('Nowcast', $alert, $analysedAt, $note, $payload)`)
    .run({ $alert: report.alert, $analysedAt: report.analysedAt, $note: report.agentNote, $payload: JSON.stringify(report) });
}

export function saveOutlookReport(report: OutlookReport, path?: string) {
  using db = getWeatherDb(path);
  db.query(`INSERT INTO agent_reports (agent, alert, analysed_at, note, payload_json)
    VALUES ('Outlook', $alert, $analysedAt, $note, $payload)`)
    .run({ $alert: report.alert, $analysedAt: report.analysedAt, $note: report.headline, $payload: JSON.stringify(report) });
}

export function readSiteData(path?: string): SiteData {
  using db = getWeatherDb(path);
  const latest = (agent: AgentRun["agent"]) => db.query<{ payload_json: string }, [string]>(
    "SELECT payload_json FROM agent_reports WHERE agent = ? ORDER BY analysed_at DESC, id DESC LIMIT 1",
  ).get(agent);
  const rows = db.query<{ agent: AgentRun["agent"]; alert: AlertLevel; analysed_at: string; note: string }, []>(
    "SELECT agent, alert, analysed_at, note FROM agent_reports ORDER BY analysed_at DESC, id DESC LIMIT 20",
  ).all();
  const primaryRow = latest("Nowcast");
  const outlookRow = latest("Outlook");
  return {
    primary: primaryRow ? JSON.parse(primaryRow.payload_json) : null,
    outlook: outlookRow ? JSON.parse(outlookRow.payload_json) : null,
    runs: rows.map((row) => ({ agent: row.agent, alert: row.alert, analysedAt: row.analysed_at, note: row.note })),
    generatedAt: new Date().toISOString(),
  };
}
