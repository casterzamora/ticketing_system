const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { z } = require("zod");
const axios = require("axios");
const cheerio = require("cheerio");

/**
 * LaraDocs MCP Server
 * Focuses on fetching and parsing Laravel documentation directly from laravel.com.
 */
class LaraDocsServer {
  constructor() {
    this.server = new Server(
      { name: "lara-docs", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );

    this.setupTools();
  }

  setupTools() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "search_laradocs",
          description: "Search specific topics in Laravel 11.x documentation",
          inputSchema: {
            type: "object",
            properties: {
              topic: { type: "string", description: "Topic to search (e.g., 'Routing', 'Eloquent', 'Migrations')" }
            },
            required: ["topic"]
          }
        }
      ]
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === "search_laradocs") {
        const topic = args.topic.toLowerCase().replace(/\s+/g, '-');
        const url = `https://laravel.com/docs/11.x/${topic}`;

        try {
          const response = await axios.get(url);
          const $ = cheerio.load(response.data);
          
          // Basic extraction of the main content
          const title = $("h1").first().text().trim();
          const summary = $("p").first().text().trim();
          
          return {
            content: [
              {
                type: "text",
                text: `Documentation for ${title}:\n\n${summary}\n\nFull link: ${url}`
              }
            ]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error fetching docs for "${args.topic}". Redirecting to search link: https://laravel.com/docs/11.x?query=${encodeURIComponent(args.topic)}` }],
            isError: true
          };
        }
      }

      throw new Error(`Tool not found: ${name}`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("LaraDocs MCP Server running on stdio");
  }
}

const server = new LaraDocsServer();
server.run().catch(console.error);
