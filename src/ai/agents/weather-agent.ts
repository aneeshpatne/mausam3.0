import { createAgent, HumanMessage, SystemMessage } from "langchain";
import { model } from "./model";

export type WeatherAgentImageInput = {
  type: "image";
  url: string;
};

const WEATHER_SYSTEM_PROMPT = `You analyze Mumbai MMR weather images.

Use only the provided images.
Do not assume sensor, station, rainfall, wind, or time values that are not present.

Return two short sections:
1. Mumbai (MMR)
2. Borivali

For each section, include:
- Current situation
- Trend
- Likely rain intensity
- Confidence

Keep it concise and practical.
If something cannot be inferred from the images, say so briefly.
The images are provided in this order: MAX-Z, PPI-Z, SRI, Satellite.`;

export async function weather_agent(images: WeatherAgentImageInput[]) {
  const agent = createAgent({ model });

  const systemMsg = new SystemMessage(WEATHER_SYSTEM_PROMPT);
  const humanMsg = new HumanMessage({
    contentBlocks: [
      {
        type: "text",
        text: "Analyze these images.",
      },
      ...images,
    ],
  });

  const messages = [systemMsg, humanMsg];

  const response = await agent.invoke({ messages });

  console.log(response);
}
