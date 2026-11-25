import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

interface McpServerConfig {
  name: string;
  command: string;
  args: string[];
}

const MCP_SERVERS: McpServerConfig[] = [
  { name: "github", command: "npx", args: ["-y", "@modelcontextprotocol/server-github"] },
  { name: "playwright", command: "npx", args: ["-y", "@modelcontextprotocol/server-playwright"] },
  { name: "bravesearch", command: "npx", args: ["-y", "@modelcontextprotocol/server-brave-search"] },
  { name: "filesystem", command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", "./"] }, 
  { name: "sqlite", command: "npx", args: ["-y", "@modelcontextprotocol/server-sqlite", "memory.db"] },
  { name: "memory", command: "npx", args: ["-y", "@modelcontextprotocol/server-memory"] },
  { name: "fetch", command: "npx", args: ["-y", "@modelcontextprotocol/server-fetch"] },
  { name: "trendradar", command: "npx", args: ["-y", "mcp-server-trendradar"] }
];

class McpManager {
  private clients: Map<string, Client> = new Map();
  private tools: any[] = [];
  public isReady = false;

  constructor() {}

  async initialize() {
    if (this.isReady) return;
    
    console.log("[MCP] Inicializando servidores MCP...");
    
    for (const config of MCP_SERVERS) {
      try {
        console.log(`[MCP] Levantando servidor: ${config.name}`);
        const isWindows = process.platform === "win32";
        const command = isWindows && config.command === "npx" ? "npx.cmd" : config.command;

        const transport = new StdioClientTransport({
          command: command,
          args: config.args,
          env: process.env
        });

        const client = new Client(
          { name: "OpenGravity-MCP", version: "1.0.0" },
          { capabilities: {} }
        );

        // Do not block forever if a server is failing to install, but for this demo we await
        await client.connect(transport);
        
        const toolsResponse = await client.listTools();
        
        for (const tool of toolsResponse.tools) {
          // Normalize tool names to be compatible with OpenAI requirements
          const formattedName = `mcp_${config.name}_${tool.name}`.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 64);
          
          this.tools.push({
            type: "function",
            function: {
              name: formattedName,
              description: (tool.description || `Herramienta ${tool.name} de ${config.name}`).substring(0, 1024),
              parameters: tool.inputSchema || { type: "object", properties: {} }
            },
            _mcpClient: client,
            _originalName: tool.name 
          });
        }
        
        this.clients.set(config.name, client);
        console.log(`[MCP] Servidor ${config.name} conectado. Herramientas registradas: ${toolsResponse.tools.length}`);
      } catch (error: any) {
        console.error(`[MCP] Fallo al iniciar servidor ${config.name}:`, error.message);
      }
    }
    this.isReady = true;
    console.log(`[MCP] Todos los servidores procesados. Herramientas MCP totales: ${this.tools.length}`);
  }

  getTools() {
    return this.tools.map(t => ({
      type: t.type,
      function: t.function
    }));
  }

  async executeTool(name: string, args: any): Promise<string> {
    const toolInfo = this.tools.find(t => t.function.name === name);
    if (!toolInfo) {
      throw new Error(`[MCP] Herramienta desconocida: ${name}`);
    }

    try {
      const client = toolInfo._mcpClient as Client;
      const result = await client.callTool({
        name: toolInfo._originalName,
        arguments: args
      });
      return JSON.stringify(result);
    } catch (error: any) {
       return `Error en MCP Tool ${name}: ${error.message}`;
    }
  }
}

export const mcpManager = new McpManager();
