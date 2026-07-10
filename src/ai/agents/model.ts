import { initChatModel } from "langchain";

export const model = await initChatModel("gpt-5.6", {
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

// if (import.meta.main) {
//   const response = await model.invoke("Reply with exactly: model.invoke works");
//   console.log(response.content);
// }
