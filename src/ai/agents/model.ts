import { initChatModel } from "langchain";

export const model = await initChatModel("gpt-5.5", {
  reasoning: { effort: "low" },
});
