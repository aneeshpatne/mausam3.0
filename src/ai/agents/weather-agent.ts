import { createAgent, HumanMessage, SystemMessage } from "langchain";
import { model } from "./model";

const agent = createAgent({ model });

const systemMsg = new SystemMessage("You are a helpful assistant.");
const humanMsg = new HumanMessage("Hello, how are you?");

const messages = [systemMsg, humanMsg];

const response = await agent.invoke({ messages });

console.log(response);
