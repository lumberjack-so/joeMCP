# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JoeMCP is an MCP (Model Context Protocol) server that exposes JoeAPI's REST endpoints as MCP tools. It acts as a bridge between MCP clients (like Claude Desktop) and any JoeAPI construction management instance.

**Key Design Principle**: This server is a standalone wrapper that connects to external JoeAPI instances via `JOEAPI_BASE_URL`. It does NOT contain the JoeAPI implementation itself - it only translates MCP tool calls to REST API requests.

## Common Commands

### Development
```bash
npm run dev          # Run with Smithery dev mode (recommended for development)
npm run local        # Run locally with tsx (bypasses Smithery)
```

### Building
```bash
npm run build        # Build using Smithery CLI
npm run compile      # Compile TypeScript directly with tsc
```

### Production
```bash
npm start            # Run compiled server from build/index.js
```

## Architecture

### Single-File MCP Server
The entire server is implemented in `src/index.ts` (~350 lines). This monolithic approach is intentional for simplicity.

**Core Components**:

1. **Configuration Schema** (`configSchema`): Zod schema defining `JOEAPI_BASE_URL` - used by Smithery for deployment configuration

2. **Request Handler** (`makeRequest` function): Central helper that:
   - Constructs JoeAPI REST URLs: `${apiBaseUrl}/api/v1${endpoint}`
   - Handles query params, request bodies, and headers
   - Converts HTTP responses to MCP tool response format
   - Returns errors as `{ content: [...], isError: true }`

3. **Server Factory** (`createServer` default export): Creates an MCP server instance and registers 15 tools using `server.registerTool(name, { title, description, inputSchema }, handler)`

### Tool Registration Pattern
All tools follow this structure using the Smithery-compatible MCP SDK API:
```typescript
server.registerTool('tool_name', {
  title: 'Tool Title',
  description: 'Human-readable description',
  inputSchema: {
    param1: z.string().describe('Param description'),
    param2: z.number().optional().describe('Optional param'),
  },
}, async (args) => {
  return makeRequest(API_BASE_URL, 'METHOD', '/endpoint', args);
});
```

**Important**: Use `server.registerTool()` NOT `server.tool()`. The latter is from an older/different API version.

### Tool Categories (15 tools total)
- **Clients & Contacts**: `list_clients`, `create_client`, `list_contacts`, `create_contact`
- **Proposals**: `list_proposals`, `get_proposal_details` (can include lines), `list_estimates`
- **Action Items**: `list_action_items`, `create_action_item`, `add_action_item_comment`, `assign_action_item_supervisor`
  - Action items support 3 types: Generic (3), Cost Change (1), Schedule Change (2)
- **Projects**: `get_project_details`, `list_project_schedules`
- **Financial**: `get_financial_summary`, `get_project_finances` (combines balances + variance)

### Multi-Request Tools
Two tools make multiple API calls to provide combined data:
- `get_proposal_details`: Fetches proposal + lines (if `includeLines: true`)
- `get_project_finances`: Fetches job-balances + cost-variance, returns combined text

## Configuration

**Required Environment Variable**:
- `JOEAPI_BASE_URL`: Base URL of the JoeAPI instance (no trailing slash)
  - Example: `https://joeapi.fly.dev`
  - For local dev: `http://localhost:3000`

**Smithery Deployment**: The `configSchema` export allows Smithery to prompt for `JOEAPI_BASE_URL` during deployment setup.

## Development Notes

### TypeScript Configuration
- Target: ES2022 with Node16 module resolution
- Output: `build/` directory (gitignored)
- Strict mode enabled

### Smithery vs Local Development
- `npm run dev`: Uses Smithery's development mode with config validation
- `npm run local`: Runs directly with tsx, requires `.env` file with `JOEAPI_BASE_URL`

### API Endpoint Structure
All JoeAPI endpoints follow the pattern: `/api/v1/{resource}`
- The `makeRequest` helper ensures endpoints start with `/` and prepends `/api/v1`
- Query params are appended via `URLSearchParams`
- POST/PUT requests send JSON bodies with `Content-Type: application/json`

### Error Handling
Errors are returned as MCP responses with `isError: true` flag:
- HTTP errors: `API Error {status}: {responseData}`
- Network errors: `Network Error: {errorMessage}`

**TypeScript Note**: All content objects must use `type: 'text' as const` (not just `'text'`) to satisfy the MCP SDK's literal type requirements.

## Testing the Server

After building, test with MCP Inspector or Claude Desktop:

**Claude Desktop Config** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "joeapi": {
      "command": "node",
      "args": ["/absolute/path/to/joeMCP/build/index.js"],
      "env": {
        "JOEAPI_BASE_URL": "https://your-joeapi-instance.com"
      }
    }
  }
}
```

Restart Claude Desktop after configuration changes.
