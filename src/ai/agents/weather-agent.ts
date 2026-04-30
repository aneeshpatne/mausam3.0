import { createAgent, HumanMessage, SystemMessage } from "langchain";
import { model } from "./model";
import { alertTool } from "../tools/alert-tool";
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
  mode: WeatherAgentMode = "default",
): Promise<void> {
  const agent = createAgent({
    model,
    tools: [sendMailTool, sendMessageTool, alertTool, scheduleNextJobTool],
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

Expected outcome:
- decide the current Mumbai MMR rain severity from the images and supplemental text
- send one concise email, one fuller Telegram update, one alert banner, and optionally one follow-up schedule
- stop after the required tool calls without returning normal assistant text

Evidence rules:
Use only the provided images, rainMsg, localStationMsg, and user text.
Treat rainMsg and localStationMsg as supplemental; they may contain zeros, missing, stale, or no-rain values.
Do not assume rainfall totals, timing, wind, lightning, storm motion, station values, neighborhood impacts, or current rain unless the combined evidence supports it.
If station/sensor values are notable, mention them in both email and Telegram.

Tool workflow:
1. Inspect all images together.
2. Decide whether another report is useful later in the active window.
3. If useful, call schedule_next_job exactly once with an appropriate delay; otherwise skip it.
4. Call send_mail exactly once with a concise user-facing email that mentions the next-update decision.
5. Call send_message exactly once with a longer, structured Telegram update without emojis, using the same severity color.
6. Call alert_tool exactly once with the final severity color and a banner message.
7. After tool calls, do not add extra text.

Severity guidance:
- green: quiet or low-risk conditions
- yellow: some showers or moderate caution
- orange: strong convection or heavy-rain risk
- red: very intense or widespread severe-rain signal

Next-run delay guidance for schedule_next_job:
- red: schedule the next run in 2 to 3 hours
- orange: schedule the next run in 3 to 6 hours
- yellow: schedule the next run in 5 to 10 hours
- green: schedule the next run in 8 to 12 hours 
- Do not bias toward scheduling the next-run early, scheduling towards the upper limit is absolutely fine.
- Never schedule below the minimum time given in guidance.

Active scheduling window:
- schedule_next_job only works for target times between 7:00 AM and 11:00 PM local time
- skip schedule_next_job if the next useful run would land outside that window or no more report is needed today

If evidence is weak, mixed, or indicates dry conditions, prefer lower-severity outcomes and explicitly communicate uncertainty.

Email:
- practical, readable, concise, and clear for a normal reader
- future-facing, using the current local time only to frame the next few hours, afternoon, evening, or rest of day
- include explicit timing when supported, preferring a specific time or narrow window over "later" or "soon"
- mention whether the next run was scheduled or why it was skipped
- may use mild technical detail or HTML-supported tags when useful

Telegram:
- more detailed and technical than the email when useful
- future-facing, with explicit timing when supported
- 8-14 lines when useful for clarity
- no emojis

The alert message must be 7 words or fewer.
The images are provided in this order: MAX-Z, PPI-Z, SRI, Satellite.`);
  const humanMsg = new HumanMessage({
    contentBlocks: [
      {
        type: "text",
        text: [
          "Analyze the latest Mumbai weather images.",
          `Current Mumbai local time: ${currentTimeText}`,
          `Pipeline mode: ${mode}`,
          "You will also receive rainMsg and localStationMsg as additional context after this message.",
          "Treat them as supportive inputs, not absolute truth.",
          "Follow the system workflow and output rules exactly.",
          "Use the labels below to map each image to its source.",
          ...images.map((image, index) => `${index + 1}. ${image.label}`),
        ].join("\n"),
      },
      ...images,
    ],
  });
  const rainMsg = new HumanMessage(rainData);
  const localStationMsg = new HumanMessage(localStation);
  const messages = [systemMsg, humanMsg, rainMsg, localStationMsg];

  const response = await agent.invoke({ messages });

  console.log("[weather-agent] Agent response received.", { response });
}
