import { createAgent, HumanMessage, SystemMessage } from "langchain";
import { model } from "./model";
import { alertTool } from "../tools/alert-tool";
import { saveStatus } from "../tools/prev_status-tool";
import { sendMailTool } from "../tools/send-mail";
import { sendMessageTool } from "../tools/send-message";
import { scheduleNextJobTool } from "../tools/schedule-next-job-tool";

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

  const systemMsg = new SystemMessage(`You analyze Mumbai MMR weather images.

Current local Mumbai time: ${currentTimeText}
${
  mode === "morning"
    ? [
        "Morning mode is active.",
        "Focus on a morning commute and the next few hours after 7:00 AM IST.",
        "Prioritize concise guidance for early-day rainfall risk, clearing trends, and whether conditions may worsen toward late morning.",
      ].join("\n")
    : "Default mode is active."
}
${prevStatus ? `Previous saved status for context: ${prevStatus}` : ""}
${
  secondaryStatus
    ? "Full future outlook from the secondary model-analysis agent is provided in a separate message after rainMsg and localStationMsg."
    : ""
}

Expected outcome:
- decide the current Mumbai MMR rain severity from the images and supplemental text
- send one concise email, one fuller Discord update, one alert banner, and optionally one follow-up schedule
- stop after the required tool calls without returning normal assistant text

Evidence rules:
Use only the provided images, rainMsg, localStationMsg, and user text.
Treat rainMsg and localStationMsg as supplemental; they may contain zeros, missing, stale, or no-rain values.
Do not assume rainfall totals, timing, wind, lightning, storm motion, station values, neighborhood impacts, or current rain unless the combined evidence supports it.
If station/sensor values are notable, mention them in both email and Discord.
The GFS and ECMWF model images are forecast guidance for the next 6 hours, not observed current rain.
Use GFS and ECMWF to inform near-future risk and timing, but let radar and station observations override model guidance when they conflict.
Mention agreement or disagreement between GFS and ECMWF when it materially changes confidence or timing.
Do not describe model precipitation as currently happening unless radar, rainMsg, or localStationMsg also supports current rain.
The future outlook (when present) is a medium-range days 1-5 context only, not a current or next-6-hours signal. It must never override current radar, rainMsg, or localStationMsg observations. The full saved secondary-agent data may be detailed; use only relevant parts when they change near-term confidence or framing, and ignore irrelevant or unsupported details.

Tool workflow:
1. Inspect all images together.
2. If previous saved status is present, use it only as compact prior context, not as ground truth.
3. Call save-current-status exactly once with the new compressed machine summary for alert, echoes, and predictions.
4. Decide whether another report is useful later in the active window.
5. If useful, call schedule_next_job exactly once with an appropriate delay; otherwise skip it.
6. Call send_mail exactly once with a concise user-facing email that mentions the next-update decision.
7. Call send_message exactly once with a longer, structured Discord update without emojis, using the same severity color.
8. Call alert_tool exactly once with the final severity color and a banner message.
9. After tool calls, do not add extra text.

Severity guidance:
- green: quiet or low-risk conditions
- yellow: some showers or moderate caution
- orange: strong convection or heavy-rain risk
- red: very intense or widespread severe-rain signal

Next-run delay guidance for schedule_next_job:
- red: schedule the next run in 2 to 3 hours
- orange: schedule the next run in 3 to 6 hours
- yellow: schedule the next run in 3 to 10 hours
- green: schedule the next run in 8 to 12 hours 
- For green, scheduling toward the upper limit is absolutely fine.
- For orange and yellow, scheduling toward the lower limit is also acceptable when the situation could evolve quickly or confidence is lower.
- Never schedule below the minimum time given in guidance.

Active scheduling window:
- schedule_next_job only works for target times between 7:00 AM and 11:00 PM local time
- if the next useful run would land outside that window, skip schedule_next_job entirely
- do not schedule a next-day run

If evidence is weak, mixed, or indicates dry conditions, prefer lower-severity outcomes and clearly say confidence is limited or the signal is mixed.

Email:
- practical, readable, concise, and clear for a normal reader
- future-facing, using the current local time only to frame the next few hours, afternoon, evening, or rest of day
- include explicit timing when supported, preferring a specific time or narrow window over "later" or "soon"
- mention whether the next run was scheduled or why it was skipped
- may use mild technical detail or HTML-supported tags when useful

Discord:
- more detailed and technical than the email when useful
- future-facing, with explicit timing when supported
- 8-14 lines when useful for clarity
- no emojis

The alert message must be 7 words or fewer.
The images are provided in this order: ${imageOrderText}.`);
  const humanMsg = new HumanMessage({
    contentBlocks: images,
  });
  const rainMsg = new HumanMessage(rainData);
  const localStationMsg = new HumanMessage(localStation);
  const secondaryStatusMsg = secondaryStatus
    ? new HumanMessage(
        `Full saved secondary-agent medium-range GFS/ECMWF context:\n${secondaryStatus}`,
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
