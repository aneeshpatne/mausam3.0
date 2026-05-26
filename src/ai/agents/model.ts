import { initChatModel } from "langchain";

export const model = await initChatModel("gpt-5.5", {
  modelProvider: "openai",
  promptCacheRetention: "24h",
  reasoningEffort: "low",
});
