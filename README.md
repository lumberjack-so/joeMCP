# JoeMCP

[![smithery badge](https://smithery.ai/badge/@lumberjack-so/joemcp)](https://smithery.ai/server/@lumberjack-so/joemcp)

MCP (Model Context Protocol) server for JoeAPI construction management system. This server exposes JoeAPI's REST endpoints as MCP tools, allowing AI assistants to interact with your JoeAPI instance.

## Features

- Connect to any JoeAPI instance via environment variable
- 15 MCP tools covering:
  - Clients & Contacts management
  - Proposals & Estimates
  - Action Items (with Cost/Schedule changes)
  - Project details & schedules
  - Financial summaries & project finances
- No authentication required - connects directly to your JoeAPI instance
- Works with Claude Desktop, Smithery, and other MCP clients

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and set your JoeAPI URL:

```env
JOEAPI_BASE_URL=https://your-joeapi-instance.com
```

### 3. Build

```bash
npm run build
```

### 4. Run

#### Development mode (with auto-reload):
```bash
npm run dev
```

#### Production mode:
```bash
npm start
```

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "joeapi": {
      "command": "node",
      "args": ["/path/to/joeMCP/build/index.js"],
      "env": {
        "JOEAPI_BASE_URL": "https://your-joeapi-instance.com"
      }
    }
  }
}
```

Restart Claude Desktop to load the server.

## Usage with Smithery

Deploy to Smithery to make your JoeAPI accessible via MCP:

1. Push this repository to GitHub
2. Connect to Smithery: https://smithery.ai
3. Configure the `JOEAPI_BASE_URL` environment variable in Smithery settings
4. Deploy and use in any MCP-compatible client

## Available Tools

### Clients & Contacts
- `list_clients` - List all clients (paginated)
- `create_client` - Create a new client
- `list_contacts` - List all contacts
- `create_contact` - Create a new contact

### Proposals & Estimates
- `list_proposals` - List all proposals
- `get_proposal_details` - Get proposal with optional lines
- `list_estimates` - List all estimates

### Action Items
- `list_action_items` - List action items for a project
- `create_action_item` - Create action item (Generic, Cost Change, or Schedule Change)
- `add_action_item_comment` - Add comment to action item
- `assign_action_item_supervisor` - Assign supervisor to action item

### Projects
- `get_project_details` - Get full project details
- `list_project_schedules` - List project schedules

### Financial
- `get_financial_summary` - Get transaction summary by timeframe
- `get_project_finances` - Get project financial overview (balances + variance)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JOEAPI_BASE_URL` | Yes | Base URL of your JoeAPI instance (no trailing slash) |

## Development

### Scripts

- `npm run dev` - Run in development mode with tsx
- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode for development
- `npm start` - Run compiled server

### Project Structure

```
joeMCP/
├── src/
│   └── index.ts          # Main MCP server
├── build/                # Compiled output (gitignored)
├── package.json
├── tsconfig.json
├── .env                  # Your configuration (gitignored)
├── .env.example          # Example configuration
└── README.md
```

## How It Works

This MCP server acts as a bridge between MCP clients (like Claude) and your JoeAPI instance:

1. Client calls an MCP tool (e.g., `list_clients`)
2. JoeMCP translates it to a REST API call
3. Makes request to your JoeAPI instance at `${JOEAPI_BASE_URL}/api/v1/clients`
4. Returns the response to the client

## Why Separate from JoeAPI?

- **Keep JoeAPI proprietary**: The main JoeAPI codebase can remain private
- **Public MCP server**: This wrapper can be open-sourced for community use
- **Flexible deployment**: Connect to any JoeAPI instance without bundling the full API
- **Easy updates**: Update the MCP server independently from JoeAPI

## License

MIT

## Links

- [JoeAPI Documentation](https://github.com/ssdavidai/joeapi)
- [MCP Specification](https://modelcontextprotocol.io)
- [Smithery](https://smithery.ai)