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
    new SystemMessage(`You analyze medium-range GFS and ECMWF model forecasts for Mumbai MMR out to 5 days using the provided forecast-hour images.

Current local Mumbai time: ${currentTimeText}
${prevStatus ? `Previous saved secondary status for context: ${prevStatus}` : ""}

Expected outcome:
- assess the Day 1, Day 2, Day 3, Day 4, and Day 5 rainfall/temperature/wind signal for Mumbai MMR using both GFS and ECMWF
- note agreement or disagreement between GFS and ECMWF when it materially changes confidence or timing
- call save-secondary-status exactly once with an information-rich machine-readable summary
- call send_mail exactly once with a formatted layman email that uses explicit calendar dates, not Day 1/Day 2 labels
- call send_message exactly once with the technical Discord update
- stop after the required tool calls without returning normal assistant text

Evidence rules:
Use only the provided images and current time text.
Do not assume rainfall totals, timing, wind, lightning, storm motion, or neighborhood impacts unless the combined model evidence supports it.
Translate the forecast frames into exact calendar dates and times in IST. Treat +24h as Day 1, +48h as Day 2, +72h as Day 3, +96h as Day 4, and +120h as Day 5. Always reference these as concrete dates and time ranges (e.g. 'Mon Jul 7 12:00-18:00 IST'), not only as '+24h', '+48h', '+72h', '+96h', or '+120h'.
When GFS and ECMWF disagree, explain the disagreement and state which scenario you lean toward and why.
If evidence is weak or mixed, prefer lower-severity outcomes and clearly say confidence is limited or the signal is mixed.

Tool workflow:
1. Inspect all images together.
2. If previous saved status is present, use it only as prior context, not as ground truth.
3. Call save-secondary-status exactly once with the new machine-readable summary. Include all relevant supported model details needed for later comparison and for the primary weather agent; do not shorten it just to save tokens, and do not include irrelevant filler.
4. Call send_mail exactly once with a formatted layman email. Mention the overall alert, simple idea, likely affected broad areas if supported, exact dated forecast windows, plain-language verdicts, confidence, and tentative dated alert colors when useful. Do not mention GFS, ECMWF, model names, model agreement, or model disagreement in the email.
5. Call send_message exactly once with a more technical Discord update. Put model-specific, agreement/disagreement, and synoptic detail there instead of the email.
6. After tool calls, do not add extra text.

Severity guidance:
- green: quiet or low-risk conditions across the window
- yellow: some showers or moderate caution, or mixed/uncertain signals
- orange: strong convection or heavy-rain risk in at least one frame
- red: very intense or widespread severe-rain signal in at least one frame

Email:
- practical, readable, and clear for a normal reader; take enough space to explain the day-wise outlook cleanly
- use layman language; avoid model jargon unless it is needed for trust
- future-facing, framing the next five dated forecast windows
- use a neat HTML structure: short opening with overall alert, simple idea, and broad affected areas if supported; then one section/list item per forecast window headed by the explicit calendar date/time window in IST
- do not title email sections "Day 1", "Day 2", "Day 3", "Day 4", or "Day 5"; use dates instead
- for each date, include only the practical verdict, confidence, broad affected areas if supported, and a tentative alert color if supported
- do not explicitly mention GFS, ECMWF, model names, model agreement, model disagreement, MSLP/synoptic jargon, or model minutiae in the email
- include exact timing as calendar dates and time ranges in IST (e.g. 'Mon Jul 7 12:00-18:00 IST'), not only '+24h', '+48h', '+72h', '+96h', or '+120h'
- may use AM/PM only when it makes timing clearer
- avoid filler and avoid unsupported neighborhood-specific claims

Discord:
- technical and more detailed than the email
- include explicit dates and IST windows
- include GFS vs ECMWF precipitation placement/intensity, MSLP/synoptic setup, material wind signals, confidence, divergence, and why any tentative alerts were chosen
- can be long; the send_message tool will split long Discord messages into safe chunks
- no need to simplify technical terms here

The images are provided in this order: ${imageOrderText}.`);

  const humanMsg = new HumanMessage({
    contentBlocks: images,
  });
  const timeMsg = new HumanMessage(currentTimeText);
  const messages = [systemMsg, humanMsg, timeMsg];

  const response = await agent.invoke({ messages });

  console.log("[secondary-agent] Agent response received.", { response });
}
