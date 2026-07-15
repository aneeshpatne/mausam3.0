import { initChatModel } from "langchain";

export const model = await initChatModel("gpt-5.6-sol", {
  modelProvider: "openai",
  useResponsesApi: true,
  promptCacheRetention: "24h",
  promptCacheKey: "mausam-primary-agent",
  reasoningEffort: "low",
});

export const secondaryModel = await initChatModel("gpt-5.6-terra", {
  modelProvider: "openai",
  useResponsesApi: true,
  promptCacheRetention: "24h",
  promptCacheKey: "mausam-secondary-agent",
  reasoningEffort: "low",
});

// if (import.meta.main) {
//   const response = await model.invoke("Reply with exactly: model.invoke works");
//   console.log(response.content);
// }
