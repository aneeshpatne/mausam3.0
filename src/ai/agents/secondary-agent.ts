import { HumanMessage, SystemMessage } from "langchain";
import * as z from "zod";
import { createRunId, runDeliveryOnce } from "../delivery-idempotency";
import { getOrCreateDecision } from "../decision-cache";
import { saveSecondaryStatus } from "../tools/secondary-save-tool";
import { sendMailToolSecondary } from "../tools/secondary-send-mail";
import { sendSecondaryMessageTool } from "../tools/secondary-send-message";
import { buildSecondaryAgentPrompt } from "./agent-prompts";
import { secondaryModel } from "./model";
import type { WeatherAgentImageInput } from "./weather-agent";

const secondaryDecisionSchema = z.object({
  alert: z.enum(["green", "yellow", "orange", "red"]).describe(
    "Peak supported severity across the complete D1-D5 window",
  ),
  compact_summary: z.string().trim().min(1).describe(
    "Token-minimal LLM-only grug-style memory preserving material facts across all five dated forecast windows",
  ),
  email_subject: z.string().trim().min(1).max(80).describe(
    "Short layman email subject, at most 80 characters",
  ),
  email_html: z.string().trim().min(1).describe(
    "Short layman HTML with an overall alert and one line per dated D1-D5 window",
  ),
  discord_message: z.string().trim().min(1).describe(
    "Dense technical D1-D5 update with exact IST windows and model comparison",
  ),
});

export async function secondaryAgent(
  images: WeatherAgentImageInput[],
  currentTimeText: string,
  prevStatus: string | null,
): Promise<void> {
  if (images.length !== 10) {
    throw new Error(`Secondary analysis requires 10 images; received ${images.length}`);
  }
  const systemMsg = new SystemMessage(buildSecondaryAgentPrompt({
    currentTimeText,
    prevStatus,
    imageOrder: images.map((image) => image.label),
  }));
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
