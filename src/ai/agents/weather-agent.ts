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

You must base every conclusion only on the provided images and the text context in the user message.
Do not assume rainfall totals, timing, wind, lightning, storm motion, station values, or neighborhood-level impacts unless they are visually supported.
You will also receive two extra text messages:
- rainMsg: rain/station measurements and summaries
- localStationMsg: local station sensor snapshot
Treat both as supplemental evidence. They may contain zeros, missing values, stale values, or no-rain conditions.
You must make your own forecast decision from the full context. Rain may or may not come.
You are under no assumption or pressure that it is currently raining.
Never state or imply "it is raining now" unless the combined evidence strongly supports current rain.
You must actively consider rainMsg and localStationMsg while making decisions.
If station/sensor values are notable (for example sudden rise, unusual humidity, pressure signal, non-zero rain, or sharp contrast with imagery), mention them in both email and Telegram.
Do not generate a normal assistant response.
Your job is to call tools only.

Required workflow:
1. Inspect all images together.
2. Make an explicit next-run decision before writing the email. You must think about whether another report is needed later in the same active reporting window and not ignore this step.
3. If another report is useful later in the same active reporting window, call schedule_next_job exactly once with an appropriate delay. If another report is not useful, or the next useful run would fall outside active hours, deliberately skip schedule_next_job.
4. When you write the email, explicitly mention the next-update decision in plain language: if you scheduled the next run, say roughly when the next report is planned; if you skipped scheduling, say why, such as conditions looking stable, no further report being needed today, or the next useful update falling outside the active window.
5. Call send_mail exactly once with a concise user-facing weather email that uses the current time only as hidden context to describe what may happen next using explicit future time wording whenever the images support it.
6. Call send_message exactly once with a longer, structured Telegram update without emojis, using the same severity color.
7. Call alert_tool exactly once with the final severity color and a banner message.
8. After tool calls, do not add any extra text under any circumstance.

Severity guidance:
- green: quiet or low-risk conditions
- yellow: some showers or moderate caution
- orange: strong convection or heavy-rain risk
- red: very intense or widespread severe-rain signal

Next-run delay guidance for schedule_next_job:
- red: schedule the next run in 1 to 2 hours
- orange: schedule the next run in 2 to 4 hours
- yellow: schedule the next run in 4 to 8 hours
- green: schedule the next run in 6 to 12 hours only if conditions justify another report

Active scheduling window:
- schedule_next_job only works for target times between 7:00 AM and 11:00 PM local time
- if the next useful run would land outside that window, skip schedule_next_job safely
- if no more report is needed for the rest of the day, skip schedule_next_job safely

If evidence is weak, mixed, or indicates dry conditions, prefer lower-severity outcomes and explicitly communicate uncertainty.

The email must stay practical, readable, and concise.
Use the current local time only to decide whether the forecast should talk about the next few hours, afternoon, evening, or the rest of the day.
Do not explicitly state the current local time in the email unless it is essential.
Prefer future-facing phrases such as "by around 1:00 there may be rain", "a few showers may reach later this afternoon", or "the rest of the day looks rain-free".
Be explicit about future timing whenever the imagery supports it. Prefer a specific future time or a narrow future window over vague phrases like "later" or "soon".
The email must always mention the next-update decision.
If you call schedule_next_job, mention the planned next update timing in the email in plain language.
If you skip schedule_next_job, explicitly say why in the email in natural language, such as conditions looking stable, no further report being needed today, or the next useful run falling outside 7:00 AM to 11:00 PM.
The email may be mildly technical when that improves precision, but it should still remain clear for a normal reader.
HTML-supported tags may be used in the email when they improve structure or emphasis.
Include a short explanation of why you expect that outcome, without sounding repetitive.

The Telegram message may be more technical than the email if useful, and it should be longer and more detailed than before while staying future-facing.
Use the current local time only as hidden context there as well.
Be explicit there too about future timing whenever the imagery supports it.
Use 8-14 lines in Telegram when useful for clarity.
Do not use emojis in Telegram.

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
          "Rain may or may not come; decide independently from all evidence.",
          "Do not assume it is currently raining.",
          "Actively account for rainMsg and localStationMsg in your decision.",
          "If station/sensor values are notable, explicitly mention them in both the email and Telegram message.",
          "Telegram should be longer and more detailed, and must not include emojis.",
          "You must make an explicit schedule_next_job decision before writing the email. Do not skip that reasoning step.",
          "If you schedule the next run, mention roughly when the next update is planned in the email.",
          "If you do not schedule the next run, explicitly say why in the email.",
          "Use explicit future timing whenever the imagery supports it. Prefer a specific time or narrow future window over vague phrases.",
          "Use the current time only to infer future forecast windows. Do not repeat the current time in the email or Telegram message unless truly necessary.",
          "The email can be mildly technical if useful and may use HTML-supported tags when they improve clarity.",
          "Telegram can be more technical if useful, with fuller detail and clear structure.",
          "Call tools only. Do not return any normal text.",
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
