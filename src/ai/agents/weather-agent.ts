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
import { MUMBAI_LOCALITY_GUIDANCE } from "./weather-locality-guidance";

export interface WeatherAgentImageInput {
  type: "image";
  url: string;
  label: string;
  [key: string]: unknown;
}

export type WeatherAgentMode = "default" | "morning";
const alertSchema = z.enum(["green", "yellow", "orange", "red"]);
const weatherDecisionSchema = z.object({
  alert: alertSchema,
  radar_summary: z.string().trim().min(1),
  prediction_summary: z.string().trim().min(1),
  schedule_delay_ms: z.number().int().positive().nullable(),
  email_subject: z.string().trim().min(1).max(80),
  email_html: z.string().trim().min(1),
  discord_message: z.string().trim().min(1).max(900),
  alert_banner: z.string().trim().min(1),
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
  const imageOrderText = images.map((image) => image.label).join(", ");
  const systemMsg = new SystemMessage(`Analyze Mumbai MMR weather evidence and return one structured reporting decision.
Current local Mumbai time: ${currentTimeText}
Mode: ${mode}. ${mode === "morning" ? "Prioritize the morning commute and late-morning trend." : ""}
${prevStatus ? `Previous saved status, context only: ${prevStatus}` : ""}
${secondaryStatus ? `Medium-range context only: ${secondaryStatus}` : ""}

Use only supplied evidence. Radar and observations outrank forecasts. GFS/ECMWF describe the next 6 hours, not current rain. Never invent totals, timing, wind, lightning, motion, impacts, or station values. With weak evidence, lower severity and confidence.
Locality rules: ${MUMBAI_LOCALITY_GUIDANCE}
Severity: green quiet; yellow moderate caution; orange heavy-rain/strong-convection risk; red intense or widespread severe-rain signal.
Scheduling delay ranges: red 2-3h, orange 3-6h, yellow 3-10h, green 8-12h. Use null when no useful same-day report before 11 PM IST exists.
Email must be concise, practical, future-facing HTML and state the next-update decision. Discord must be technical, future-facing, 8-14 short lines when useful, and contain no emojis. Alert banner must be plain language and at most 7 words.
Image order: ${imageOrderText}.`);
  const messages = [
    systemMsg,
    new HumanMessage({ contentBlocks: images }),
    new HumanMessage(rainData || "Rain station data unavailable."),
    new HumanMessage(localStation),
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
