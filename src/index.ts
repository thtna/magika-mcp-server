import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "node:fs/promises";
import { ResilientMagika } from "./resilient-magika.js";

const resilientMagika = new ResilientMagika();
const server = new Server(
  {
    name: "magika-mcp-server",
    version: "1.0.0",
  },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "magika_analyze_path",
        description: "Analyze a file using Google's Magika AI to determine its file type. Includes self-healing capability.",
        inputSchema: {
          type: "object",
          properties: {
            filePath: { type: "string" },
          },
          required: ["filePath"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "magika_analyze_path") {
    const filePath = request.params.arguments?.filePath;
    if (typeof filePath !== "string") {
      return { content: [{ type: "text", text: "Lỗi: Tham số filePath không hợp lệ." }], isError: true };
    }
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) throw new Error("Không phải là tệp hợp lệ.");
      const result = await resilientMagika.analyzeFile(filePath);
      return { content: [{ type: "text", text: result }] };
    } catch (err: any) {
      return { content: [{ type: "text", text: `Lỗi Hệ Thống: ${err.message}` }], isError: true };
    }
  }
  throw new Error(`Công cụ không được hỗ trợ: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Magika MCP Server running (Auto-Healing Enabled) over stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
