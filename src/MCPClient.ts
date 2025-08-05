import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export default class MCPClient {
  private mcp: Client;
  private command: string;
  private args: string[];
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];

  constructor(name: string, command: string, args: string[], version?: string) {
    this.mcp = new Client({
      name,
      version: version || "1.0.0",
    });
    this.command = command;
    this.args = args;
  }

  public init() {
    return this.connectToServer();
  }

  public close() {
    this.transport?.close();
  }

  public getTools() {
    return this.tools;
  }

  public callTool(toolName: string, args: Record<string, any>) {
    return this.mcp.callTool({
      name: toolName,
      arguments: args,
    });
  }

  private async connectToServer() {
    try {
      this.transport = new StdioClientTransport({
        command: this.command,
        args: this.args,
      });
      await this.mcp.connect(this.transport);

      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        };
      });
      console.log(
        "Connected to server with tools:",
        this.tools.map(({ name }) => name)
      );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }
}
