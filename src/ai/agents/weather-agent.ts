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

export interface WeatherAgentImageInput {
  type: "image";
  url: string;
  label: string;
  [key: string]: unknown;
}

export type WeatherAgentMode = "default" | "morning";
const alertSchema = z.enum(["green", "yellow", "orange", "red"]);
const weatherDecisionSchema = z.object({
  alert: alertSchema.describe("Overall current and near-term Mumbai MMR severity"),
  radar_summary: z.string().trim().min(1).describe(
    "Token-minimal LLM-only grug-style fragments describing current radar echoes; abbreviations and semicolons, no prose or filler",
  ),
  prediction_summary: z.string().trim().min(1).describe(
    "Token-minimal LLM-only grug-style fragments preserving material near-term timing, trend, confidence, and risk",
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
  validateDelay(decision.alert, decision.schedule_delay_ms);
  await runDeliveryOnce(runId, "save-status", async () =>
    saveStatus.invoke({
      alert: decision.alert,
      echo: decision.radar_summary,
      predictions: decision.prediction_summary,
    }),
  );
  if (decision.schedule_delay_ms !== null) {
    await runDeliveryOnce(runId, "schedule", async () =>
      scheduleNextJobTool.invoke({ delay_ms: decision.schedule_delay_ms! }),
    );
  }
  await runDeliveryOnce(runId, "email", async () =>
    sendMailTool.invoke({
      alert_color: decision.alert,
      subject: decision.email_subject,
      mail_content: decision.email_html,
    }),
  );
  await runDeliveryOnce(runId, "discord", async () =>
    sendMessageTool.invoke({
      alert_color: decision.alert,
      message: decision.discord_message,
    }),
  );
  await runDeliveryOnce(runId, "alert", async () =>
    alertTool.invoke({ color: decision.alert, message: decision.alert_banner }),
  );
}
