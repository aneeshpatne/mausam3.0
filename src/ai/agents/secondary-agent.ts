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
- call send_mail exactly once with a short, compressed layman email (alert first) that uses explicit calendar dates, not Day 1/Day 2 labels
- call send_message exactly once with a compact technical Discord update
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
- short, direct, and straight to the point; no filler, no warmup sentences
- lead with the overall alert as the very first thing, then a brief one-or-two line explanation, then the dated outlook
- use layman language; no model jargon or model names
- compact HTML structure: one alert line at the top, then one tight line/row per dated forecast window
- for each date, give the practical verdict, confidence, affected areas if supported, and a tentative alert color if supported in a single concise line
- do not title email sections "Day 1", "Day 2", etc.; use explicit calendar date/time windows in IST (e.g. 'Mon Jul 7 12:00-18:00 IST')
- no neighborhood-specific claims unless supported
- keep the whole email as compressed as possible while staying clear

Discord:
- compressed and dense; one short message, not a long report
- lead with the alert verdict, then a compact technical breakdown in a few lines max
- include explicit IST date windows, GFS vs ECMWF precip placement/intensity, MSLP/synoptic setup, wind signals, confidence, and why alerts were chosen — all in as few lines as possible
- prefer terse label: value lines over paragraphs
- no need to simplify technical terms, but do not pad

The images are provided in this order: ${imageOrderText}.`);

  const humanMsg = new HumanMessage({
    contentBlocks: images,
  });
  const timeMsg = new HumanMessage(currentTimeText);
  const messages = [systemMsg, humanMsg, timeMsg];

  const response = await agent.invoke({ messages });

  console.log("[secondary-agent] Agent response received.", { response });
}
