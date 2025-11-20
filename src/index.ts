#!/usr/bin/env node

/**
 * JoeAPI MCP Server
 *
 * Exposes JoeAPI construction management REST API as MCP tools.
 * Connects to any JoeAPI instance via JOEAPI_BASE_URL configuration.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// Configuration schema for Smithery
export const configSchema = z.object({
  JOEAPI_BASE_URL: z
    .string()
    .url()
    .describe('Base URL of your JoeAPI instance (e.g., https://joeapi.fly.dev)'),
});

// Helper to handle API requests
async function makeRequest(
  apiBaseUrl: string,
  method: string,
  endpoint: string,
  data: any = null,
  params: Record<string, any> = {}
) {
  try {
    // Ensure endpoint starts with /
    const safeEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // Build URL with query params
    const url = new URL(`${apiBaseUrl}/api/v1${safeEndpoint}`);
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

// Export default createServer function for Smithery
export default function createServer({ config }: { config: z.infer<typeof configSchema> }) {
  const API_BASE_URL = config.JOEAPI_BASE_URL;

  // Create MCP Server
  const server = new McpServer({
    name: 'joe-api-server',
    version: '1.0.0',
  });

  // Register tools
  server.tool(
    'list_clients',
    'Retrieve a paginated list of clients',
    {
      page: z.number().optional().describe('Page number (default: 1)'),
      limit: z.number().optional().describe('Items per page (default: 5, max: 100)'),
    },
    async ({ page, limit }) => {
      return makeRequest(API_BASE_URL, 'GET', '/clients', null, {
        page: page || 1,
        limit: limit || 5,
      });
    }
  );

  server.tool(
    'create_client',
    'Create a new client record',
    {
      Name: z.string().describe('Client name'),
      EmailAddress: z.string().describe('Client email address'),
      CompanyName: z.string().describe('Company name'),
      Phone: z.string().describe('Phone number'),
    },
    async (args) => {
      return makeRequest(API_BASE_URL, 'POST', '/clients', args);
    }
  );

  server.tool(
    'list_contacts',
    'Retrieve a list of contacts',
    {
      limit: z.number().optional().describe('Items per page (default: 5)'),
    },
    async ({ limit }) => {
      return makeRequest(API_BASE_URL, 'GET', '/contacts', null, { limit: limit || 5 });
    }
  );

  server.tool(
    'create_contact',
    'Create a new contact',
    {
      Name: z.string().describe('Contact name'),
      Email: z.string().describe('Email address'),
      Phone: z.string().describe('Phone number'),
      City: z.string().optional().describe('City'),
      State: z.string().optional().describe('State'),
    },
    async (args) => {
      return makeRequest(API_BASE_URL, 'POST', '/contacts', args);
    }
  );

  server.tool(
    'list_proposals',
    'List all proposals',
    {
      limit: z.number().optional().describe('Items per page (default: 5)'),
    },
    async ({ limit }) => {
      return makeRequest(API_BASE_URL, 'GET', '/proposals', null, { limit: limit || 5 });
    }
  );

  server.tool(
    'get_proposal_details',
    'Get specific proposal details including lines',
    {
      proposalId: z.string().describe('UUID of the proposal'),
      includeLines: z
        .boolean()
        .optional()
        .describe('If true, fetches proposal lines in a separate request'),
    },
    async ({ proposalId, includeLines }) => {
      const proposal = await makeRequest(API_BASE_URL, 'GET', `/proposals/${proposalId}`);

      if (includeLines && !proposal.isError) {
        const lines = await makeRequest(API_BASE_URL, 'GET', '/proposallines', null, {
          proposalId,
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
  );

  server.tool(
    'list_estimates',
    'List all estimates',
    {
      limit: z.number().optional().describe('Items per page (default: 5)'),
    },
    async ({ limit }) => {
      return makeRequest(API_BASE_URL, 'GET', '/estimates', null, { limit: limit || 5 });
    }
  );

  server.tool(
    'list_action_items',
    'List action items for a specific project',
    {
      projectId: z.string().describe('UUID of the project'),
      limit: z.number().optional().describe('Items per page (default: 5)'),
    },
    async ({ projectId, limit }) => {
      return makeRequest(API_BASE_URL, 'GET', '/action-items', null, {
        projectId,
        limit: limit || 5,
      });
    }
  );

  server.tool(
    'create_action_item',
    'Create a new Action Item',
    {
      Title: z.string().describe('Action item title'),
      Description: z.string().describe('Action item description'),
      ProjectId: z.string().describe('UUID of the project'),
      ActionTypeId: z.number().describe('1=CostChange, 2=ScheduleChange, 3=Generic'),
      DueDate: z.string().describe('ISO Date YYYY-MM-DD'),
      Status: z.number().optional().describe('Status code (default: 1)'),
      Source: z.number().optional().describe('Source code (default: 1)'),
      InitialComment: z.string().optional().describe('Initial comment'),
      CostChange: z
        .object({
          Amount: z.number(),
          EstimateCategoryId: z.string(),
          RequiresClientApproval: z.boolean(),
        })
        .optional(),
      ScheduleChange: z
        .object({
          NoOfDays: z.number(),
          ConstructionTaskId: z.string(),
          RequiresClientApproval: z.boolean(),
        })
        .optional(),
    },
    async (args) => {
      return makeRequest(API_BASE_URL, 'POST', '/action-items', args);
    }
  );

  server.tool(
    'add_action_item_comment',
    'Add a comment to an action item',
    {
      actionItemId: z.string().describe('Action item ID'),
      comment: z.string().describe('Comment text'),
    },
    async ({ actionItemId, comment }) => {
      return makeRequest(API_BASE_URL, 'POST', `/action-items/${actionItemId}/comments`, {
        Comment: comment,
      });
    }
  );

  server.tool(
    'assign_action_item_supervisor',
    'Assign a supervisor to an action item',
    {
      actionItemId: z.string().describe('Action item ID'),
      supervisorId: z.number().describe('Supervisor user ID'),
    },
    async ({ actionItemId, supervisorId }) => {
      return makeRequest(API_BASE_URL, 'POST', `/action-items/${actionItemId}/supervisors`, {
        SupervisorId: supervisorId,
      });
    }
  );

  server.tool(
    'get_project_details',
    'Get full details of a project',
    {
      projectId: z.string().describe('UUID of the project'),
    },
    async ({ projectId }) => {
      return makeRequest(API_BASE_URL, 'GET', `/project-details/${projectId}`);
    }
  );

  server.tool(
    'list_project_schedules',
    'List project schedules',
    {
      limit: z.number().optional().describe('Items per page (default: 5)'),
    },
    async ({ limit }) => {
      return makeRequest(API_BASE_URL, 'GET', '/project-schedules', null, { limit: limit || 5 });
    }
  );

  server.tool(
    'get_financial_summary',
    'Get transaction summary grouped by timeframe',
    {
      groupBy: z.enum(['month', 'year', 'week']).optional().describe('Group by timeframe'),
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format'),
    },
    async ({ groupBy, startDate, endDate }) => {
      return makeRequest(API_BASE_URL, 'GET', '/transactions/summary', null, {
        groupBy: groupBy || 'month',
        startDate,
        endDate,
      });
    }
  );

  server.tool(
    'get_project_finances',
    'Get financial overview for a specific project',
    {
      projectId: z.string().describe('UUID of the project'),
    },
    async ({ projectId }) => {
      const balances = await makeRequest(API_BASE_URL, 'GET', '/job-balances', null, {
        projectId,
      });
      const variance = await makeRequest(API_BASE_URL, 'GET', '/cost-variance', null, {
        projectId,
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
  );

  return server.server;
}
