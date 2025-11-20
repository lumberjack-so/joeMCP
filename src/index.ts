#!/usr/bin/env node

/**
 * JoeAPI MCP Server
 *
 * Exposes JoeAPI construction management REST API as MCP tools.
 * Connects to any JoeAPI instance via JOEAPI_BASE_URL environment variable.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';

// Load environment variables
config();

// Validate required environment variable
const API_BASE_URL = process.env.JOEAPI_BASE_URL;

if (!API_BASE_URL) {
  console.error('❌ ERROR: JOEAPI_BASE_URL environment variable is required');
  console.error('Example: export JOEAPI_BASE_URL=https://your-joeapi-instance.com');
  process.exit(1);
}

console.error(`✅ Connecting to JoeAPI at: ${API_BASE_URL}`);

// Helper to handle API requests
async function makeRequest(
  method: string,
  endpoint: string,
  data: any = null,
  params: Record<string, any> = {}
) {
  try {
    // Ensure endpoint starts with /
    const safeEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // Build URL with query params
    const url = new URL(`${API_BASE_URL}/api/v1${safeEndpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url.toString(), options);
    const responseData = await response.json();

    if (!response.ok) {
      return {
        content: [
          {
            type: 'text',
            text: `API Error ${response.status}: ${JSON.stringify(responseData, null, 2)}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(responseData, null, 2),
        },
      ],
    };
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Network Error: ${errorMsg}`,
        },
      ],
      isError: true,
    };
  }
}

// Create MCP Server
const server = new Server(
  {
    name: 'joe-api-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ==========================================
// 1. CLIENTS & CONTACTS TOOLS
// ==========================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_clients',
        description: 'Retrieve a paginated list of clients',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            limit: {
              type: 'number',
              description: 'Items per page (default: 5, max: 100)',
            },
          },
        },
      },
      {
        name: 'create_client',
        description: 'Create a new client record',
        inputSchema: {
          type: 'object',
          properties: {
            Name: {
              type: 'string',
              description: 'Client name',
            },
            EmailAddress: {
              type: 'string',
              description: 'Client email address',
            },
            CompanyName: {
              type: 'string',
              description: 'Company name',
            },
            Phone: {
              type: 'string',
              description: 'Phone number',
            },
          },
          required: ['Name', 'EmailAddress', 'CompanyName', 'Phone'],
        },
      },
      {
        name: 'list_contacts',
        description: 'Retrieve a list of contacts',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Items per page (default: 5)',
            },
          },
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact',
        inputSchema: {
          type: 'object',
          properties: {
            Name: {
              type: 'string',
              description: 'Contact name',
            },
            Email: {
              type: 'string',
              description: 'Email address',
            },
            Phone: {
              type: 'string',
              description: 'Phone number',
            },
            City: {
              type: 'string',
              description: 'City (optional)',
            },
            State: {
              type: 'string',
              description: 'State (optional)',
            },
          },
          required: ['Name', 'Email', 'Phone'],
        },
      },

      // ==========================================
      // 2. PROPOSALS & ESTIMATES TOOLS
      // ==========================================

      {
        name: 'list_proposals',
        description: 'List all proposals',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Items per page (default: 5)',
            },
          },
        },
      },
      {
        name: 'get_proposal_details',
        description: 'Get specific proposal details including lines',
        inputSchema: {
          type: 'object',
          properties: {
            proposalId: {
              type: 'string',
              description: 'UUID of the proposal',
            },
            includeLines: {
              type: 'boolean',
              description: 'If true, fetches proposal lines in a separate request (default: false)',
            },
          },
          required: ['proposalId'],
        },
      },
      {
        name: 'list_estimates',
        description: 'List all estimates',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Items per page (default: 5)',
            },
          },
        },
      },

      // ==========================================
      // 3. ACTION ITEMS TOOLS
      // ==========================================

      {
        name: 'list_action_items',
        description: 'List action items for a specific project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'UUID of the project',
            },
            limit: {
              type: 'number',
              description: 'Items per page (default: 5)',
            },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'create_action_item',
        description:
          'Create a new Action Item. Can be Generic (ActionTypeId=3), Cost Change (ActionTypeId=1), or Schedule Change (ActionTypeId=2). For Cost/Schedule changes, include the corresponding nested object.',
        inputSchema: {
          type: 'object',
          properties: {
            Title: {
              type: 'string',
              description: 'Action item title',
            },
            Description: {
              type: 'string',
              description: 'Action item description',
            },
            ProjectId: {
              type: 'string',
              description: 'UUID of the project',
            },
            ActionTypeId: {
              type: 'number',
              description: '1=CostChange, 2=ScheduleChange, 3=Generic',
            },
            DueDate: {
              type: 'string',
              description: 'ISO Date YYYY-MM-DD',
            },
            Status: {
              type: 'number',
              description: 'Status code (default: 1)',
            },
            Source: {
              type: 'number',
              description: 'Source code (default: 1)',
            },
            InitialComment: {
              type: 'string',
              description: 'Initial comment (optional)',
            },
            CostChange: {
              type: 'object',
              description: 'Cost change details (required if ActionTypeId=1)',
              properties: {
                Amount: {
                  type: 'number',
                  description: 'Cost change amount',
                },
                EstimateCategoryId: {
                  type: 'string',
                  description: 'UUID of estimate category',
                },
                RequiresClientApproval: {
                  type: 'boolean',
                  description: 'Whether client approval is required',
                },
              },
            },
            ScheduleChange: {
              type: 'object',
              description: 'Schedule change details (required if ActionTypeId=2)',
              properties: {
                NoOfDays: {
                  type: 'number',
                  description: 'Number of days to adjust schedule',
                },
                ConstructionTaskId: {
                  type: 'string',
                  description: 'UUID of construction task',
                },
                RequiresClientApproval: {
                  type: 'boolean',
                  description: 'Whether client approval is required',
                },
              },
            },
          },
          required: ['Title', 'Description', 'ProjectId', 'ActionTypeId', 'DueDate'],
        },
      },
      {
        name: 'add_action_item_comment',
        description: 'Add a comment to an action item',
        inputSchema: {
          type: 'object',
          properties: {
            actionItemId: {
              type: 'string',
              description: 'Action item ID',
            },
            comment: {
              type: 'string',
              description: 'Comment text',
            },
          },
          required: ['actionItemId', 'comment'],
        },
      },
      {
        name: 'assign_action_item_supervisor',
        description: 'Assign a supervisor to an action item',
        inputSchema: {
          type: 'object',
          properties: {
            actionItemId: {
              type: 'string',
              description: 'Action item ID',
            },
            supervisorId: {
              type: 'number',
              description: 'Supervisor user ID',
            },
          },
          required: ['actionItemId', 'supervisorId'],
        },
      },

      // ==========================================
      // 4. PROJECTS TOOLS
      // ==========================================

      {
        name: 'get_project_details',
        description: 'Get full details of a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'UUID of the project',
            },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'list_project_schedules',
        description: 'List project schedules',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Items per page (default: 5)',
            },
          },
        },
      },

      // ==========================================
      // 5. FINANCIAL TOOLS
      // ==========================================

      {
        name: 'get_financial_summary',
        description: 'Get transaction summary grouped by timeframe',
        inputSchema: {
          type: 'object',
          properties: {
            groupBy: {
              type: 'string',
              description: 'Group by: month, year, or week (default: month)',
              enum: ['month', 'year', 'week'],
            },
            startDate: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            endDate: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
          },
          required: ['startDate', 'endDate'],
        },
      },
      {
        name: 'get_project_finances',
        description:
          'Get financial overview for a specific project (Job Balances and Cost Variance)',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'UUID of the project',
            },
          },
          required: ['projectId'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Type guard: ensure args is defined
  if (!args) {
    return {
      content: [
        {
          type: 'text',
          text: 'No arguments provided',
        },
      ],
      isError: true,
    };
  }

  try {
    switch (name) {
      // ===== CLIENTS =====
      case 'list_clients':
        return makeRequest('GET', '/clients', null, {
          page: args.page || 1,
          limit: args.limit || 5,
        });

      case 'create_client':
        return makeRequest('POST', '/clients', args);

      // ===== CONTACTS =====
      case 'list_contacts':
        return makeRequest('GET', '/contacts', null, {
          limit: args.limit || 5,
        });

      case 'create_contact':
        return makeRequest('POST', '/contacts', args);

      // ===== PROPOSALS =====
      case 'list_proposals':
        return makeRequest('GET', '/proposals', null, {
          limit: args.limit || 5,
        });

      case 'get_proposal_details': {
        const proposal = await makeRequest('GET', `/proposals/${args.proposalId}`);

        if (args.includeLines && !proposal.isError) {
          const lines = await makeRequest('GET', '/proposallines', null, {
            proposalId: args.proposalId,
          });
          return {
            content: [
              {
                type: 'text',
                text: `PROPOSAL:\n${proposal.content[0].text}\n\nLINES:\n${lines.content[0].text}`,
              },
            ],
          };
        }
        return proposal;
      }

      // ===== ESTIMATES =====
      case 'list_estimates':
        return makeRequest('GET', '/estimates', null, {
          limit: args.limit || 5,
        });

      // ===== ACTION ITEMS =====
      case 'list_action_items':
        return makeRequest('GET', '/action-items', null, {
          projectId: args.projectId,
          limit: args.limit || 5,
        });

      case 'create_action_item':
        return makeRequest('POST', '/action-items', args);

      case 'add_action_item_comment':
        return makeRequest('POST', `/action-items/${args.actionItemId}/comments`, {
          Comment: args.comment,
        });

      case 'assign_action_item_supervisor':
        return makeRequest('POST', `/action-items/${args.actionItemId}/supervisors`, {
          SupervisorId: args.supervisorId,
        });

      // ===== PROJECTS =====
      case 'get_project_details':
        return makeRequest('GET', `/project-details/${args.projectId}`);

      case 'list_project_schedules':
        return makeRequest('GET', '/project-schedules', null, {
          limit: args.limit || 5,
        });

      // ===== FINANCIAL =====
      case 'get_financial_summary':
        return makeRequest('GET', '/transactions/summary', null, {
          groupBy: args.groupBy || 'month',
          startDate: args.startDate,
          endDate: args.endDate,
        });

      case 'get_project_finances': {
        const balances = await makeRequest('GET', '/job-balances', null, {
          projectId: args.projectId,
        });
        const variance = await makeRequest('GET', '/cost-variance', null, {
          projectId: args.projectId,
        });

        return {
          content: [
            {
              type: 'text',
              text: `JOB BALANCES:\n${balances.content[0].text}\n\nCOST VARIANCE:\n${variance.content[0].text}`,
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error.message || String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('JoeAPI MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
