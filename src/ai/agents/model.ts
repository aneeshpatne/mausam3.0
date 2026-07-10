import { initChatModel } from "langchain";

export const model = await initChatModel("gpt-5.6-sol", {
  modelProvider: "openai",
  promptCacheRetention: "24h",
  promptCacheKey: "mausam-primary-agent",
  reasoningEffort: "low",
});

export const secondaryModel = await initChatModel("gpt-5.4-mini", {
  modelProvider: "openai",
  promptCacheRetention: "24h",
  promptCacheKey: "mausam-secondary-agent",
  reasoningEffort: "low",
});
