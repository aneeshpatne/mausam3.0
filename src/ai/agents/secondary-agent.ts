import type { WeatherAgentImageInput } from "./weather-agent";
import { createAgent, HumanMessage, SystemMessage } from "langchain";
import { secondaryModel } from "./model";
import { saveSecondaryStatus } from "../tools/secondary-save-tool";
import { sendMailToolSecondary } from "../tools/secondary-send-mail";
import { sendSecondaryMessageTool } from "../tools/secondary-send-message";

export async function secondaryAgent(
  images: WeatherAgentImageInput[],
  currentTimeText: string,
  prevStatus: string | null,
): Promise<void> {
  const imageOrderText = images.map((image) => image.label).join(", ");
  const agent = createAgent({
    model: secondaryModel,
    tools: [saveSecondaryStatus, sendMailToolSecondary, sendSecondaryMessageTool],
  });

  const systemMsg =
    new SystemMessage(`Analyze the supplied GFS and ECMWF images for Mumbai MMR's D1-D5 outlook and complete the reporting workflow.

Current local Mumbai time: ${currentTimeText}
${prevStatus ? `Previous saved secondary status for context: ${prevStatus}` : ""}

Success means assessing rainfall, temperature, and wind across all five days; handling material model agreement/disagreement; saving compact LLM-only memory; and sending one layman email plus one technical Discord update. Complete the required tool calls and return no assistant text.

Evidence:
- Use only the supplied images and current-time text. Previous saved status is context, not ground truth.
- Do not infer unsupported totals, timing, wind, lightning, motion, or neighborhood impacts.
- Map +24/+48/+72/+96/+120h to D1/D2/D3/D4/D5, then use exact calendar dates and IST windows in user-facing outputs rather than forecast-hour or Day labels.
- When models materially disagree, explain the difference, preferred scenario, and reason. With weak or mixed evidence, lower severity and state limited confidence.

Completion order:
1. Inspect all images together.
2. Call save-secondary-status exactly once with token-minimal grug-style fragments: abbreviations, symbols, pipes/semicolons; no full sentences, filler, repeated context, or human-readability work. Preserve only material supported signals needed later.
3. Call send_mail exactly once.
4. Call send_message exactly once.

Severity guidance:
- green: quiet or low-risk conditions across the window
- yellow: some showers or moderate caution, or mixed/uncertain signals
- orange: strong convection or heavy-rain risk in at least one frame
- red: very intense or widespread severe-rain signal in at least one frame

Email:
- Short layman HTML: overall alert first, a 1-2 line explanation, then one tight line per dated window. No warmup or filler.
- Each line contains the practical verdict, confidence, supported broad areas, and tentative alert when useful.
- each dated forecast line must start in this exact pattern: \`Thu Jul 09 2026, 07:00 AM-11:59 PM IST - 🟡 - (Yellow) Alert: ...\`
- use the matching emoji for the alert color on each dated line: green \`🟢\`, yellow \`🟡\`, orange \`🟠\`, red \`🔴\`
- Do not expose model names, agreement/disagreement, or synoptic jargon. Do not add unsupported neighborhood claims.

Discord:
- One dense technical message: alert first, then a few terse label:value lines.
- Include exact IST windows, GFS vs ECMWF precipitation placement/intensity, material MSLP/synoptic and wind signals, confidence, and alert rationale. No padding.

Image order: ${imageOrderText}.`);

  const humanMsg = new HumanMessage({
    contentBlocks: images,
  });
  const timeMsg = new HumanMessage(currentTimeText);
  const messages = [systemMsg, humanMsg, timeMsg];

  const response = await agent.invoke({ messages });

  console.log("[secondary-agent] Agent response received.", { response });
}
