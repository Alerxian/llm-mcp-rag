import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { OpenAI } from "openai";
import "dotenv/config";
import { logger } from "./logger";

type MessageParam = OpenAI.Chat.ChatCompletionMessageParam;

export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export default class ChatOpenAI {
  private llm: OpenAI;
  private model: string = "";
  private messages: MessageParam[] = [];
  private tools: Tool[];

  constructor(
    model: string,
    systemPrompt = "",
    tools: Tool[] = [],
    context = ""
  ) {
    this.llm = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_BASE_URL,
    });
    this.model = model;
    this.tools = tools;
    if (systemPrompt) {
      this.messages.push({
        role: "system",
        content: systemPrompt,
      });
    }

    if (context) {
      this.messages.push({
        role: "user",
        content: context,
      });
    }
  }

  async chat(prompt?: string) {
    logger("CHAT");
    if (prompt) this.messages.push({ role: "user", content: prompt });
    const stream = await this.llm.chat.completions.create({
      model: this.model,
      messages: this.messages,
      tools: this.getToolsDefinition(),
      stream: true,
    });
    let content = "";
    let toolCalls: ToolCall[] = [];
    logger("RESPONSE");
    for await (const chunk of stream) {
      const delta = chunk.choices[0].delta;
      // 处理content
      if (delta.content) {
        content += delta.content || "";
      }

      // 处理tool_calls
      if (delta.tool_calls) {
        for (const toolCallChunk of delta.tool_calls) {
          // 第一次创建一个toolCall
          if (toolCalls.length <= toolCallChunk.index) {
            toolCalls.push({ id: "", function: { name: "", arguments: "" } });
          }
          let currentToolCall = toolCalls[toolCallChunk.index];
          if (toolCallChunk.id) currentToolCall.id += toolCallChunk.id;
          if (toolCallChunk.function?.name)
            currentToolCall.function.name += toolCallChunk.function.name;
          if (toolCallChunk.function?.arguments)
            currentToolCall.function.arguments +=
              toolCallChunk.function.arguments;
        }
      }
    }

    this.messages.push({
      role: "assistant",
      content,
      tool_calls: toolCalls.map((tool) => ({
        id: tool.id,
        type: "function",
        function: tool.function,
      })),
    });

    return {
      content,
      toolCalls,
    };
  }

  private getToolsDefinition() {
    // mcp和openai的tool适配
    return this.tools.map((tool) => {
      return {
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        },
      };
    });
  }

  public appendToolResult(toolCallId: string, toolOutput: string) {
    this.messages.push({
      role: "tool",
      content: toolOutput,
      tool_call_id: toolCallId,
    });
  }
}
