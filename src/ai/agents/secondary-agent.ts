import { HumanMessage, SystemMessage } from "langchain";
import * as z from "zod";
import { createRunId, runDeliveryOnce } from "../delivery-idempotency";
import { getOrCreateDecision } from "../decision-cache";
import { saveSecondaryStatus } from "../tools/secondary-save-tool";
import { sendMailToolSecondary } from "../tools/secondary-send-mail";
import { sendSecondaryMessageTool } from "../tools/secondary-send-message";
import { secondaryModel } from "./model";
import type { WeatherAgentImageInput } from "./weather-agent";

const secondaryDecisionSchema = z.object({
  alert: z.enum(["green", "yellow", "orange", "red"]),
  compact_summary: z.string().trim().min(1),
  email_subject: z.string().trim().min(1).max(80),
  email_html: z.string().trim().min(1),
  discord_message: z.string().trim().min(1),
});

export async function secondaryAgent(
  images: WeatherAgentImageInput[],
  currentTimeText: string,
  prevStatus: string | null,
): Promise<void> {
  if (images.length !== 10) {
    throw new Error(`Secondary analysis requires 10 images; received ${images.length}`);
  }
  const systemMsg = new SystemMessage(`Analyze the supplied GFS and ECMWF images for Mumbai MMR's D1-D5 outlook and return one structured reporting decision.
Current Mumbai time: ${currentTimeText}
${prevStatus ? `Previous status is context only: ${prevStatus}` : ""}
Use only supplied images. Map +24/+48/+72/+96/+120h to exact calendar dates and IST windows. Explain material model disagreement and lower confidence when evidence is mixed. Do not invent totals, timing, wind, lightning, or impacts.
The compact summary is machine-only terse fragments. Email is short layman HTML with one line per dated window, no model names or synoptic jargon. Discord is a dense technical update including GFS/ECMWF differences, precipitation, pressure/wind signals, confidence, and rationale.`);
  const runId = createRunId("secondary", images.map((image) => image.url));
  const structuredModel = secondaryModel.withStructuredOutput(
    secondaryDecisionSchema,
    { name: "secondary_weather_decision" },
  );
  const decision = await getOrCreateDecision(
    runId,
    secondaryDecisionSchema,
    () => structuredModel.invoke(
      [systemMsg, new HumanMessage({ contentBlocks: images })],
      { signal: AbortSignal.timeout(120_000) },
    ),
  );
  await runDeliveryOnce(runId, "save-status", async () =>
    saveSecondaryStatus.invoke({
      alert: decision.alert,
      summary: decision.compact_summary,
    }),
  );
  await runDeliveryOnce(runId, "email", async () =>
    sendMailToolSecondary.invoke({
      alert_color: decision.alert,
      subject: decision.email_subject,
      mail_content: decision.email_html,
    }),
  );
  await runDeliveryOnce(runId, "discord", async () =>
    sendSecondaryMessageTool.invoke({
      alert_color: decision.alert,
      message: decision.discord_message,
    }),
  );
}
