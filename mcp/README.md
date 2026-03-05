# Memory MCP Server

MCP (Model Context Protocol) server for the Memory Platform. Works with Claude Desktop, Cursor, Cline, and any MCP-compatible client.

## Setup for Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["/path/to/memory-platform/mcp/index.js"],
      "env": {
        "MEMORY_URL": "https://memoryplatform-production.up.railway.app",
        "MEMORY_TOKEN": "your-token-here"
      }
    }
  }
}
```

## Setup for Cursor / Cline

Add to your MCP settings:

```json
{
  "memory": {
    "command": "node",
    "args": ["/path/to/mcp/index.js"],
    "env": {
      "MEMORY_URL": "https://memoryplatform-production.up.railway.app",
      "MEMORY_TOKEN": "your-token-here"
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `memory_search` | Search by query, date, category, keyword, importance |
| `memory_save` | Save a new memory |
| `memory_batch_save` | Save multiple memories at once |
| `memory_update` | Update an existing memory |
| `memory_delete` | Delete a memory |
| `memory_stats` | Overview stats |
| `memory_calendar` | Monthly calendar heatmap |
| `memory_categories` | List categories with counts |
| `memory_keywords` | List keywords with frequency |

## Install & Run

```bash
cd mcp
npm install
MEMORY_URL=https://memoryplatform-production.up.railway.app MEMORY_TOKEN=your-token node index.js
```
