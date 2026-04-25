const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const mysql = require("mysql2/promise");

const READ_ONLY_SQL_PATTERN = /^\s*(select|show|describe|explain|with)\b/i;
const SAFE_IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * MySQL Database MCP Server
 * Allows querying your Laravel project's local database.
 */
class DatabaseServer {
  constructor() {
    this.server = new Server(
      { name: "lara-db", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );

    this.pool = mysql.createPool({
      host: process.env.MCP_DB_HOST || process.env.DB_HOST || "127.0.0.1",
      user: process.env.MCP_DB_USER || process.env.DB_USERNAME || "root",
      password: process.env.MCP_DB_PASSWORD || process.env.DB_PASSWORD || "",
      database: process.env.MCP_DB_DATABASE || process.env.DB_DATABASE || "laravel",
      port: Number(process.env.MCP_DB_PORT || process.env.DB_PORT || 3306),
      waitForConnections: true,
      connectionLimit: 10,
    });

    this.setupTools();
  }

  setupTools() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "query_database",
          description: "Run a read-only SQL SELECT query on your Laravel database",
          inputSchema: {
            type: "object",
            properties: {
              sql: { type: "string", description: "The SELECT query to execute" }
            },
            required: ["sql"]
          }
        },
        {
          name: "describe_table",
          description: "See the columns and types for a specific table",
          inputSchema: {
            type: "object",
            properties: {
              table: { type: "string", description: "Table name (e.g., 'bookings')" }
            },
            required: ["table"]
          }
        }
      ]
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (name === "query_database") {
          const sql = String(args.sql || "").trim();
          if (!READ_ONLY_SQL_PATTERN.test(sql)) {
            return {
              content: [{ type: "text", text: "Only read-only SQL is allowed (SELECT, SHOW, DESCRIBE, EXPLAIN, WITH)." }],
              isError: true,
            };
          }

          const [rows] = await this.pool.query(args.sql);
          return {
            content: [{ type: "text", text: JSON.stringify(rows, null, 2) }]
          };
        }

        if (name === "describe_table") {
          const table = String(args.table || "").trim();
          if (!SAFE_IDENTIFIER_PATTERN.test(table)) {
            return {
              content: [{ type: "text", text: "Invalid table name. Use alphanumeric and underscore characters only." }],
              isError: true,
            };
          }

          const [rows] = await this.pool.query(`DESCRIBE \`${table}\``);
          return {
            content: [{ type: "text", text: JSON.stringify(rows, null, 2) }]
          };
        }
      } catch (error) {
        return {
          content: [{ type: "text", text: `SQL Error: ${error.message}` }],
          isError: true
        };
      }

      throw new Error(`Tool not found: ${name}`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("LaraDB MCP Server running via stdio");
  }
}

const server = new DatabaseServer();
server.run().catch(console.error);
