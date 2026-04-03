import { createAgent, HumanMessage, SystemMessage } from "langchain";
import { model } from "./model";
import { alert_tool } from "../tools/alert-tool";
import { save_summary_tool } from "../tools/save-summary-tool";
import { send_mail } from "../tools/send-mail";

export interface WeatherAgentImageInput {
  type: "image";
  url: string;
  label: string;
  bucketName: string;
  [key: string]: unknown;
}

function buildWeatherSystemPrompt(currentTimeText: string): string {
  return `You analyze Mumbai MMR weather images.

Current local Mumbai time: ${currentTimeText}

You must base every conclusion only on the provided images and the text context in the user message.
Do not assume rainfall totals, timing, wind, lightning, storm motion, station values, or neighborhood-level impacts unless they are visually supported.
Do not generate a normal assistant response.
Your job is to call tools only.

Required workflow:
1. Inspect all images together.
2. Call save_summary_tool exactly once with a markdown summary for internal use.
3. Call send_mail exactly once with a short plain-language update for users that references time progression using AM/PM wording.
4. Call alert_tool exactly once with the final severity color and a banner message.
5. After tool calls, do not add any extra text.

Severity guidance:
- green: quiet or low-risk conditions
- yellow: some showers or moderate caution
- orange: strong convection or heavy-rain risk
- red: very intense or widespread severe-rain signal

The summary must include:
- Overview
- Mumbai (MMR)
- Borivali
- Evidence from MAX-Z, PPI-Z, SRI, and Satellite
- Confidence and key uncertainty

The email must stay practical and non-technical.
In the email, explicitly anchor the update to the current local time and describe near-term risk in day progression terms (for example: this morning, by late afternoon, by evening) using AM/PM format.
The alert message must be 7 words or fewer.
The images are provided in this order: MAX-Z, PPI-Z, SRI, Satellite.`;
}

export async function weatherAgent(
  images: WeatherAgentImageInput[],
  currentTimeText: string,
): Promise<void> {
  const agent = createAgent({
    model,
    tools: [save_summary_tool, send_mail, alert_tool],
  });

  const systemMsg = new SystemMessage(
    buildWeatherSystemPrompt(currentTimeText),
  );
  const humanMsg = new HumanMessage({
    contentBlocks: [
      {
        type: "text",
        text: [
          "Analyze the latest Mumbai weather images.",
          `Current Mumbai local time: ${currentTimeText}`,
          "When describing timing, always use AM/PM.",
          "Use the labels below to map each image to its source.",
          ...images.map((image, index) => `${index + 1}. ${image.label}}`),
        ].join("\n"),
      },
      ...images,
    ],
  });

  const messages = [systemMsg, humanMsg];

  const response = await agent.invoke({ messages });

  console.log(response);
}
