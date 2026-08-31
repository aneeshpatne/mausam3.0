import { HumanMessage, SystemMessage } from "langchain";
import * as z from "zod";
import { alertTool } from "../tools/alert-tool";
import { getOrCreateDecision } from "../decision-cache";
import { saveStatus } from "../tools/prev_status-tool";
import { scheduleNextJobTool } from "../tools/schedule-next-job-tool";
import { sendMailTool } from "../tools/send-mail";
import { sendMessageTool } from "../tools/send-message";
import { createRunId, runDeliveryOnce } from "../delivery-idempotency";
import { model } from "./model";
import { buildPrimaryAgentPrompt } from "./agent-prompts";
import { savePrimaryReport } from "../../storage/weather-db";

export interface WeatherAgentImageInput {
  type: "image";
  url: string;
  label: string;
  [key: string]: unknown;
}

export type WeatherAgentMode = "default" | "morning";
const alertSchema = z.enum(["green", "yellow", "orange", "red"]);
export const weatherDecisionSchema = z.object({
  // These must be distinct Zod instances. OpenAI's Zod converter turns reused
  // instances into $refs, then puts title/description beside the $ref, which
  // Structured Outputs rejects.
  borivali_alert: z.enum(["green", "yellow", "orange", "red"]).describe(
    "Borivali current and near-term severity",
  ),
  mumbai_alert: z.enum(["green", "yellow", "orange", "red"]).describe(
    "Mumbai/MMR current and near-term severity",
  ),
  mumbai_radar_summary: z.string().trim().min(1).describe(
    "Token-minimal Mumbai/MMR-wide radar memory for persistence",
  ),
  borivali_prediction_summary: z.string().trim().min(1).describe(
    "Token-minimal Borivali near-term forecast across 0-1h, 1-3h, and 3-6h",
  ),
  mumbai_prediction_summary: z.string().trim().min(1).describe(
    "Token-minimal Mumbai/MMR-wide near-term forecast across 0-1h, 1-3h, and 3-6h for persistence",
  ),
  schedule_delay_ms: z.number().int().positive().nullable().describe(
    "Milliseconds until a useful same-day follow-up, or null when none should run before 11 PM IST",
  ),
  email_subject: z.string().trim().min(1).max(80).describe(
    "Concise user-facing email subject, at most 80 characters",
  ),
  email_html: z.string().trim().min(1).describe(
    "Concise practical layman HTML that follows the email requirements",
  ),
  discord_message: z.string().trim().min(1).max(900).describe(
    "Technical future-facing Discord update, no more than 900 characters",
  ),
  alert_banner: z.string().trim().min(1).describe(
    "Plain-language alert banner of no more than 7 words",
  ),
  mumbai_website: z.object({
    headline: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    rain_chance: z.number().int().min(0).max(100),
    expected_peak: z.string().trim().min(1),
    confidence: z.enum(["Low", "Medium", "High"]),
    agent_note: z.string().trim().min(1),
    temperature_c: z.number().nullable(),
    feels_like_c: z.number().nullable(),
    wind: z.string().trim().min(1).nullable(),
    rain_rate: z.string().trim().min(1).nullable(),
    station: z.string().trim().min(1).nullable(),
    station_updated_at: z.string().trim().min(1).nullable(),
    source_summary: z.string().trim().min(1),
  }).describe("Mumbai/MMR-wide website card data derived only from supplied evidence"),
});

const delayRanges: Record<z.infer<typeof alertSchema>, [number, number]> = {
  red: [2, 3],
  orange: [3, 6],
  yellow: [3, 10],
  green: [8, 12],
};

function validateDelay(alert: z.infer<typeof alertSchema>, delay: number | null) {
  if (delay === null) return;
  const [minimum, maximum] = delayRanges[alert];
  if (delay < minimum * 3_600_000 || delay > maximum * 3_600_000) {
    throw new Error(`Schedule delay is outside the ${alert} range`);
  }
}

export async function weatherAgent(
  images: WeatherAgentImageInput[],
  currentTimeText: string,
  rainData: string,
  localStation: string,
  prevStatus: string | null,
  secondaryStatus: string | null,
  mode: WeatherAgentMode = "default",
  runDiscriminator?: string,
): Promise<void> {
  if (images.length === 0) throw new Error("Weather analysis requires images");
  const systemMsg = new SystemMessage(buildPrimaryAgentPrompt({
    currentTimeText,
    mode,
    prevStatus,
    secondaryStatus,
    imageOrder: images.map((image) => image.label),
  }));
  const messages = [
    systemMsg,
    new HumanMessage({ contentBlocks: images }),
    new HumanMessage(
      `<rain_observations>${rainData || "unavailable"}</rain_observations>`,
    ),
    new HumanMessage(
      `<local_station_observations>${localStation || "unavailable"}</local_station_observations>`,
    ),
  ];
  const runId = createRunId("primary", [
    mode,
    runDiscriminator ?? "image-change",
    ...images.map((image) => image.url),
  ]);
  const structuredModel = model.withStructuredOutput(weatherDecisionSchema, {
    name: "weather_reporting_decision",
  });
  const decision = await getOrCreateDecision(
    runId,
    weatherDecisionSchema,
    () => structuredModel.invoke(messages, {
        signal: AbortSignal.timeout(120_000),
      }),
  );
  validateDelay(decision.borivali_alert, decision.schedule_delay_ms);
  await runDeliveryOnce(runId, "save-status", async () =>
    saveStatus.invoke({
      alert: decision.mumbai_alert,
      echo: decision.mumbai_radar_summary,
      predictions: decision.mumbai_prediction_summary,
    }),
  );
  await runDeliveryOnce(runId, "save-website", async () => {
    savePrimaryReport({
      alert: decision.mumbai_alert,
      headline: decision.mumbai_website.headline,
      summary: decision.mumbai_website.summary,
      analysedAt: new Date().toISOString(),
      rainChance: decision.mumbai_website.rain_chance,
      expectedPeak: decision.mumbai_website.expected_peak,
      confidence: decision.mumbai_website.confidence,
      agentNote: decision.mumbai_website.agent_note,
      temperatureC: decision.mumbai_website.temperature_c,
      feelsLikeC: decision.mumbai_website.feels_like_c,
      wind: decision.mumbai_website.wind,
      rainRate: decision.mumbai_website.rain_rate,
      station: decision.mumbai_website.station,
      stationUpdatedAt: decision.mumbai_website.station_updated_at,
      sourceSummary: decision.mumbai_website.source_summary,
    });
  });
  if (decision.schedule_delay_ms !== null) {
    await runDeliveryOnce(runId, "schedule", async () =>
      scheduleNextJobTool.invoke({ delay_ms: decision.schedule_delay_ms! }),
    );
  }
  await runDeliveryOnce(runId, "email", async () =>
    sendMailTool.invoke({
      alert_color: decision.borivali_alert,
      subject: decision.email_subject,
      mail_content: decision.email_html,
    }),
  );
  await runDeliveryOnce(runId, "discord", async () =>
    sendMessageTool.invoke({
      alert_color: decision.borivali_alert,
      message: decision.discord_message,
    }),
  );
  await runDeliveryOnce(runId, "alert", async () =>
    alertTool.invoke({ color: decision.borivali_alert, message: decision.alert_banner }),
  );
}
