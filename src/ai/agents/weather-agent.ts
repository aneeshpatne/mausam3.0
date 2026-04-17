import { createAgent, HumanMessage, SystemMessage } from "langchain";
import { model } from "./model";
import { createAlertTool } from "../tools/alert-tool";
import { createSendMailTool } from "../tools/send-mail";
import { createSendMessageTool } from "../tools/send-message";

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
    tools: [createSendMailTool(), createSendMessageTool(), createAlertTool()],
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
Do not generate a normal assistant response.
Your job is to call tools only.

Required workflow:
1. Inspect all images together.
2. Call send_mail exactly once with a concise user-facing weather email that uses the current time only as hidden context to describe what may happen next using explicit future time wording whenever the images support it.
3. Call send_message exactly once with a concise Telegram update that includes weather emojis and uses the same severity color.
4. Call alert_tool exactly once with the final severity color and a banner message.
5. After tool calls, do not add any extra text under any circumstance.

Severity guidance:
- green: quiet or low-risk conditions
- yellow: some showers or moderate caution
- orange: strong convection or heavy-rain risk
- red: very intense or widespread severe-rain signal

If evidence is weak, mixed, or indicates dry conditions, prefer lower-severity outcomes and explicitly communicate uncertainty.

The email must stay practical, readable, and concise.
Use the current local time only to decide whether the forecast should talk about the next few hours, afternoon, evening, or the rest of the day.
Do not explicitly state the current local time in the email unless it is essential.
Prefer future-facing phrases such as "by around 1:00 there may be rain", "a few showers may reach later this afternoon", or "the rest of the day looks rain-free".
Be explicit about future timing whenever the imagery supports it. Prefer a specific future time or a narrow future window over vague phrases like "later" or "soon".
The email may be mildly technical when that improves precision, but it should still remain clear for a normal reader.
HTML-supported tags may be used in the email when they improve structure or emphasis.
Include a short explanation of why you expect that outcome, without sounding repetitive.

The Telegram message may be more technical than the email if useful, but it must still stay concise and future-facing.
Use the current local time only as hidden context there as well.
Be explicit there too about future timing whenever the imagery supports it.
Use 3-6 short lines in Telegram and include weather-appropriate emojis.

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
          "Use explicit future timing whenever the imagery supports it. Prefer a specific time or narrow future window over vague phrases.",
          "Use the current time only to infer future forecast windows. Do not repeat the current time in the email or Telegram message unless truly necessary.",
          "The email can be mildly technical if useful and may use HTML-supported tags when they improve clarity.",
          "Telegram can be more technical if useful, but it should still be concise.",
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

  console.log(response);
}
