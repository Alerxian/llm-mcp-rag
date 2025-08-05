import path from "node:path";
import ChatOpenAI from "./ChatOpenAI";
import { logger } from "./logger";
import MCPClient from "./MCPClient";
import Agent from "./Agent";
import EmbeddingRetriever from "./EmbeddingReTriever";
import fs from "node:fs";

const URL = "https://news.ycombinator.com/";
const outPath = path.join(process.cwd(), "output");
const TASK = `
告诉我Antonette的信息,先从我给你的context中找到相关信息,总结后创作一个关于她的故事
把故事和她的基本信息保存到${outPath}/antonette.md,输出一个漂亮md文件
`;
const task1 = `获取https://jsonplaceholder.typicode.com/users的结果，并将每个用户的信息保存到${path.join(
  process.cwd(),
  "knowledge"
)}下面的md文件中，保存10条信息，每一个单独保存md文件`;
const fetchMcp = new MCPClient("fetch", "uvx", ["mcp-server-fetch"]);
const fileMcp = new MCPClient("mcp-server-file", "npx", [
  "-y",
  "@modelcontextprotocol/server-filesystem",
  process.cwd(),
]);

async function main() {
  logger("Starting the application...");
  // const llm = new ChatOpenAI("Qwen/Qwen3-8B");
  // const { content, toolCalls } = await llm.chat("你好");
  // console.log("Response content:", content);
  // console.log("Tool calls:", toolCalls);

  // await fetchMcp.init();
  // const tools = fetchMcp.getTools();
  // console.log(tools);
  // fetchMcp.close();
  //RAG
  retrieveContext();

  const agent = new Agent("Qwen/Qwen3-8B", [fetchMcp, fileMcp]);
  await agent.init();
  const response = await agent.invoke(TASK);
  console.log(response);
  await agent.close();
}

async function retrieveContext() {
  // RAG
  const embeddingRetriever = new EmbeddingRetriever("BAAI/bge-m3");
  const knowledgeDir = path.join(process.cwd(), "knowledge");
  const files = fs.readdirSync(knowledgeDir);
  for await (const file of files) {
    const content = fs.readFileSync(path.join(knowledgeDir, file), "utf-8");
    await embeddingRetriever.embedDocument(content);
  }
  const context = (await embeddingRetriever.retrieve(TASK, 3)).join("\n");
  logger("CONTEXT");
  console.log(context);
  return context;
}

main();
