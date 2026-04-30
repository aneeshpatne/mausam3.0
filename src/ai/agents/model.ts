import { initChatModel } from "langchain";

export const model = await initChatModel("openai:gpt-5.5", {
  reasoningEffort: "low",
});
