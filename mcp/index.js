#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const MEMORY_URL = process.env.MEMORY_URL || "https://memoryplatform-production.up.railway.app";
const MEMORY_TOKEN = process.env.MEMORY_TOKEN || "";

async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (MEMORY_TOKEN) headers["Authorization"] = `Bearer ${MEMORY_TOKEN}`;

  const res = await fetch(`${MEMORY_URL}${path}`, { ...opts, headers });
  return res.json();
}

const server = new McpServer({
  name: "Memory Platform",
  version: "1.0.0",
});

// ─── Tools ───

server.tool(
  "memory_search",
  "Search memories by full-text query, date, category, keyword, or importance",
  {
    q: z.string().optional().describe("Full-text search query"),
    date: z.string().optional().describe("Filter by date (YYYY-MM-DD)"),
    month: z.string().optional().describe("Filter by month (YYYY-MM)"),
    category: z.string().optional().describe("Filter by category"),
    keyword: z.string().optional().describe("Filter by keyword tag"),
    importance: z.number().optional().describe("Minimum importance (1-5)"),
    limit: z.number().optional().describe("Max results (default 20)"),
  },
  async (params) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    }
    if (!qs.has("limit")) qs.set("limit", "20");
    const res = await api(`/api/memories?${qs}`);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  }
);

server.tool(
  "memory_save",
  "Save a new memory to the platform",
  {
    date: z.string().describe("Date (YYYY-MM-DD)"),
    content: z.string().describe("What to remember"),
    keywords: z.array(z.string()).optional().describe("Tags for retrieval"),
    category: z.string().optional().describe("Category (relationship, technical, preference, project, identity, health, academic, daily, financial, general)"),
    importance: z.number().optional().describe("1=trivial, 2=minor, 3=normal, 4=important, 5=critical"),
    time: z.string().optional().describe("Time (HH:MM)"),
    source: z.string().optional().describe("Where this came from"),
  },
  async (params) => {
    const res = await api("/api/memories", {
      method: "POST",
      body: JSON.stringify({
        ...params,
        keywords: params.keywords || [],
        category: params.category || "general",
        importance: params.importance || 3,
      }),
    });
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  }
);

server.tool(
  "memory_batch_save",
  "Save multiple memories at once",
  {
    memories: z.array(z.object({
      date: z.string(),
      content: z.string(),
      keywords: z.array(z.string()).optional(),
      category: z.string().optional(),
      importance: z.number().optional(),
      time: z.string().optional(),
      source: z.string().optional(),
    })).describe("Array of memories to save"),
  },
  async ({ memories }) => {
    const res = await api("/api/memories/batch", {
      method: "POST",
      body: JSON.stringify({ memories }),
    });
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  }
);

server.tool(
  "memory_update",
  "Update an existing memory by ID",
  {
    id: z.number().describe("Memory ID to update"),
    content: z.string().optional().describe("Updated content"),
    keywords: z.array(z.string()).optional().describe("Updated keywords"),
    category: z.string().optional().describe("Updated category"),
    importance: z.number().optional().describe("Updated importance"),
    date: z.string().optional().describe("Updated date"),
    time: z.string().optional().describe("Updated time"),
  },
  async ({ id, ...updates }) => {
    const body = {};
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) body[k] = v;
    }
    const res = await api(`/api/memories/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  }
);

server.tool(
  "memory_delete",
  "Delete a memory by ID",
  {
    id: z.number().describe("Memory ID to delete"),
  },
  async ({ id }) => {
    const res = await api(`/api/memories/${id}`, { method: "DELETE" });
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  }
);

server.tool(
  "memory_stats",
  "Get overview stats (total memories, categories, date range)",
  {},
  async () => {
    const res = await api("/api/stats");
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  }
);

server.tool(
  "memory_calendar",
  "Get memory counts by date for a given month (calendar heatmap)",
  {
    month: z.string().describe("Year-month (YYYY-MM)"),
  },
  async ({ month }) => {
    const res = await api(`/api/memories/calendar/${month}`);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  }
);

server.tool(
  "memory_categories",
  "List all memory categories with counts",
  {},
  async () => {
    const res = await api("/api/memories/categories");
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  }
);

server.tool(
  "memory_keywords",
  "List all keywords with frequency",
  {},
  async () => {
    const res = await api("/api/memories/keywords");
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  }
);

// ─── Start ───

const transport = new StdioServerTransport();
await server.connect(transport);
