import { createAgent, HumanMessage, SystemMessage } from "langchain";
import { model } from "./model";
import { alertTool } from "../tools/alert-tool";
import { saveStatus } from "../tools/prev_status-tool";
import { sendMailTool } from "../tools/send-mail";
import { sendMessageTool } from "../tools/send-message";
import { scheduleNextJobTool } from "../tools/schedule-next-job-tool";
import { MUMBAI_LOCALITY_GUIDANCE } from "./weather-locality-guidance";

export interface WeatherAgentImageInput {
  type: "image";
  url: string;
  label: string;
  [key: string]: unknown;
}

export type WeatherAgentMode = "default" | "morning";

export async function weatherAgent(
  images: WeatherAgentImageInput[],
  currentTimeText: string,
  rainData: string,
  localStation: string,
  prevStatus: string | null,
  secondaryStatus: string | null,
  mode: WeatherAgentMode = "default",
): Promise<void> {
  const imageOrderText = images.map((image) => image.label).join(", ");
  const agent = createAgent({
    model,
    tools: [
      saveStatus,
      sendMailTool,
      sendMessageTool,
      alertTool,
      scheduleNextJobTool,
    ],
  });

  const systemMsg = new SystemMessage(`Analyze Mumbai MMR weather conditions and complete the reporting workflow.

Current local Mumbai time: ${currentTimeText}
${
  mode === "morning"
    ? [
        "Morning mode is active.",
        "Prioritize the morning commute, the next few hours after 7:00 AM IST, clearing trends, and any worsening toward late morning.",
      ].join("\n")
    : "Default mode is active."
}
${prevStatus ? `Previous saved status for context: ${prevStatus}` : ""}
${
  secondaryStatus
    ? "A separate message after the station data contains compact D1-D5 outlook memory."
    : ""
}

Success means choosing one evidence-supported severity, saving the new compact state, deciding whether to schedule another report, then sending one email, one Discord update, and one alert banner with the same severity. Complete the required tool calls and return no assistant text.

Evidence:
- Use only the supplied images, rain and station messages, saved context, and user text. Do not infer unsupported totals, timing, wind, lightning, motion, station values, local impacts, or current rain.
- Radar and station observations outrank forecast guidance when they conflict. Rain/station text is supplemental and may be zero, missing, stale, or dry.
- GFS/ECMWF images describe the next 6 hours, not current rain. Use them for future risk/timing; describe precipitation as current only when radar or observations corroborate it. Mention material model agreement/disagreement.
- D1-D5 memory is prior medium-range context, never a current or next-6-hour signal. Expand compact notation from context and use it only when it materially changes confidence or framing.
- Saved state is prior context, not ground truth. Mention notable station/sensor values in both email and Discord.
- With weak, mixed, or dry evidence, choose lower severity and state the limited confidence or mixed signal.

Mumbai/MMR locality naming rules:
${MUMBAI_LOCALITY_GUIDANCE}

Completion order:
1. Inspect all images together.
2. Call save-current-status exactly once.
3. Decide whether another useful report fits the scheduling rules; call schedule_next_job once or skip it.
4. Call send_mail, send_message, and alert_tool exactly once each, in that order.

Severity guidance:
- green: quiet or low-risk conditions
- yellow: some showers or moderate caution
- orange: strong convection or heavy-rain risk
- red: very intense or widespread severe-rain signal

Scheduling:
- Delay ranges: red 2-3h; orange 3-6h; yellow 3-10h; green 8-12h. Never go below a range minimum.
- Favor the upper green range. Favor the lower orange/yellow range when evolution may be quick or confidence is lower.
- Schedule only when the target is today between 7:00 AM and 11:00 PM local time; otherwise skip. Never schedule next day.

Email:
- Practical, concise, readable, and future-facing; mild technical detail and supported HTML are allowed.
- Prefer supported exact or narrow timing over vague wording. Use current time only to frame the future.
- Say roughly when the next report is planned or why scheduling was skipped.

Discord:
- More detailed/technical than email, future-facing, and explicit about supported timing.
- Use 8-14 lines when useful; no emojis.

Alert banner: plain language, 7 words or fewer.
Image order: ${imageOrderText}.`);
  const humanMsg = new HumanMessage({
    contentBlocks: images,
  });
  const rainMsg = new HumanMessage(rainData);
  const localStationMsg = new HumanMessage(localStation);
  const secondaryStatusMsg = secondaryStatus
    ? new HumanMessage(
        `Compact saved secondary-agent medium-range GFS/ECMWF context:\n${secondaryStatus}`,
      )
    : null;
  const messages = [
    systemMsg,
    humanMsg,
    rainMsg,
    localStationMsg,
    ...(secondaryStatusMsg ? [secondaryStatusMsg] : []),
  ];

  const response = await agent.invoke({ messages });

  console.log("[weather-agent] Agent response received.", { response });
}
