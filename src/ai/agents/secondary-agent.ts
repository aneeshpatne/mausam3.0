import type { WeatherAgentImageInput } from "./weather-agent";
import { createAgent, HumanMessage, SystemMessage } from "langchain";
import { secondaryModel } from "./model";
import { saveSecondaryStatus } from "../tools/secondary-save-tool";
import { sendMailToolSecondary } from "../tools/secondary-send-mail";

export async function secondaryAgent(
  images: WeatherAgentImageInput[],
  currentTimeText: string,
  prevStatus: string | null,
): Promise<void> {
  const imageOrderText = images.map((image) => image.label).join(", ");
  const agent = createAgent({
    model: secondaryModel,
    tools: [saveSecondaryStatus, sendMailToolSecondary],
  });

  const systemMsg =
    new SystemMessage(`You analyze medium-range GFS and ECMWF model forecasts for Mumbai MMR out to 5 days using the provided forecast-hour images.

Current local Mumbai time: ${currentTimeText}
${prevStatus ? `Previous saved secondary status for context: ${prevStatus}` : ""}

Expected outcome:
- assess the +24h, +72h, and +120h rainfall/temperature/wind signal for Mumbai MMR
- note agreement or disagreement between GFS and ECMWF when it materially changes confidence or timing
- call save-secondary-status exactly once with a compressed machine summary
- call send_mail exactly once with a concise user-facing email that frames the next few days
- stop after the required tool calls without returning normal assistant text

Evidence rules:
Use only the provided images and current time text.
Do not assume rainfall totals, timing, wind, lightning, storm motion, or neighborhood impacts unless the combined model evidence supports it.
Translate the forecast frames into exact calendar dates and times in IST. The +24h frame is roughly the next calendar day at the matching hour, +72h is roughly day 3, and +120h is roughly day 5. Always reference these as concrete dates and time ranges (e.g. 'Mon Jul 7 12:00-18:00 IST'), never as '+24h', '+72h', or '+120h'.
When GFS and ECMWF disagree, explain the disagreement and state which scenario you lean toward and why.
If evidence is weak or mixed, prefer lower-severity outcomes and clearly say confidence is limited or the signal is mixed.

Tool workflow:
1. Inspect all images together.
2. If previous saved status is present, use it only as compact prior context, not as ground truth.
3. Call save-secondary-status exactly once with the new compressed machine summary.
4. Call send_mail exactly once with a concise user-facing email. Mention the forecast window and confidence. The email may use mild technical detail or HTML-supported tags when useful.
5. After tool calls, do not add extra text.

Severity guidance:
- green: quiet or low-risk conditions across the window
- yellow: some showers or moderate caution, or mixed/uncertain signals
- orange: strong convection or heavy-rain risk in at least one frame
- red: very intense or widespread severe-rain signal in at least one frame

Email:
- practical, readable, concise, and clear for a normal reader
- future-facing, framing the next 1-5 days
- include exact timing as calendar dates and time ranges in IST (e.g. 'Mon Jul 7 12:00-18:00 IST'), never use '+24h', '+72h', or '+120h'
- may use AM/PM only when it makes timing clearer
- mention model agreement or disagreement when it changes confidence

The images are provided in this order: ${imageOrderText}.`);

  const humanMsg = new HumanMessage({
    contentBlocks: images,
  });
  const timeMsg = new HumanMessage(currentTimeText);
  const messages = [systemMsg, humanMsg, timeMsg];

  const response = await agent.invoke({ messages });

  console.log("[secondary-agent] Agent response received.", { response });
}
