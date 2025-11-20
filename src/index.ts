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
            type: 'text' as const,
            text: `API Error ${response.status}: ${JSON.stringify(responseData, null, 2)}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(responseData, null, 2),
        },
      ],
    };
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    return {
      content: [
        {
          type: 'text' as const,
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
  server.registerTool('list_clients', {
    title: 'List Clients',
    description: 'Retrieve a paginated list of clients',
    inputSchema: {
      page: z.number().optional().describe('Page number (default: 1)'),
      limit: z.number().optional().describe('Items per page (default: 5, max: 100)'),
    },
  }, async ({ page, limit }) => {
    return makeRequest(API_BASE_URL, 'GET', '/clients', null, {
      page: page || 1,
      limit: limit || 5,
    });
  });

  server.registerTool('create_client', {
    title: 'Create Client',
    description: 'Create a new client record',
    inputSchema: {
      Name: z.string().describe('Client name'),
      EmailAddress: z.string().describe('Client email address'),
      CompanyName: z.string().describe('Company name'),
      Phone: z.string().describe('Phone number'),
    },
  }, async (args) => {
    return makeRequest(API_BASE_URL, 'POST', '/clients', args);
  });

  server.registerTool('list_contacts', {
    title: 'List Contacts',
    description: 'Retrieve a list of contacts',
    inputSchema: {
      limit: z.number().optional().describe('Items per page (default: 5)'),
    },
  }, async ({ limit }) => {
    return makeRequest(API_BASE_URL, 'GET', '/contacts', null, { limit: limit || 5 });
  });

  server.registerTool('create_contact', {
    title: 'Create Contact',
    description: 'Create a new contact',
    inputSchema: {
      Name: z.string().describe('Contact name'),
      Email: z.string().describe('Email address'),
      Phone: z.string().describe('Phone number'),
      City: z.string().optional().describe('City'),
      State: z.string().optional().describe('State'),
    },
  }, async (args) => {
    return makeRequest(API_BASE_URL, 'POST', '/contacts', args);
  });

  server.registerTool('list_proposals', {
    title: 'List Proposals',
    description: 'List all proposals',
    inputSchema: {
      limit: z.number().optional().describe('Items per page (default: 5)'),
    },
  }, async ({ limit }) => {
    return makeRequest(API_BASE_URL, 'GET', '/proposals', null, { limit: limit || 5 });
  });

  server.registerTool('get_proposal_details', {
    title: 'Get Proposal Details',
    description: 'Get specific proposal details including lines',
    inputSchema: {
      proposalId: z.string().describe('UUID of the proposal'),
      includeLines: z
        .boolean()
        .optional()
        .describe('If true, fetches proposal lines in a separate request'),
    },
  }, async ({ proposalId, includeLines }) => {
    const proposal = await makeRequest(API_BASE_URL, 'GET', `/proposals/${proposalId}`);

    if (includeLines && !proposal.isError) {
      const lines = await makeRequest(API_BASE_URL, 'GET', '/proposallines', null, {
        proposalId,
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: `PROPOSAL:\n${proposal.content[0].text}\n\nLINES:\n${lines.content[0].text}`,
          },
        ],
      };
    }
    return proposal;
  });

  server.registerTool('list_estimates', {
    title: 'List Estimates',
    description: 'List all estimates',
    inputSchema: {
      limit: z.number().optional().describe('Items per page (default: 5)'),
    },
  }, async ({ limit }) => {
    return makeRequest(API_BASE_URL, 'GET', '/estimates', null, { limit: limit || 5 });
  });

  server.registerTool('list_action_items', {
    title: 'List Action Items',
    description: 'List action items for a specific project',
    inputSchema: {
      projectId: z.string().describe('UUID of the project'),
      limit: z.number().optional().describe('Items per page (default: 5)'),
    },
  }, async ({ projectId, limit }) => {
    return makeRequest(API_BASE_URL, 'GET', '/action-items', null, {
      projectId,
      limit: limit || 5,
    });
  });

  server.registerTool('create_action_item', {
    title: 'Create Action Item',
    description: 'Create a new Action Item',
    inputSchema: {
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
  }, async (args) => {
    return makeRequest(API_BASE_URL, 'POST', '/action-items', args);
  });

  server.registerTool('add_action_item_comment', {
    title: 'Add Action Item Comment',
    description: 'Add a comment to an action item',
    inputSchema: {
      actionItemId: z.string().describe('Action item ID'),
      comment: z.string().describe('Comment text'),
    },
  }, async ({ actionItemId, comment }) => {
    return makeRequest(API_BASE_URL, 'POST', `/action-items/${actionItemId}/comments`, {
      Comment: comment,
    });
  });

  server.registerTool('assign_action_item_supervisor', {
    title: 'Assign Action Item Supervisor',
    description: 'Assign a supervisor to an action item',
    inputSchema: {
      actionItemId: z.string().describe('Action item ID'),
      supervisorId: z.number().describe('Supervisor user ID'),
    },
  }, async ({ actionItemId, supervisorId }) => {
    return makeRequest(API_BASE_URL, 'POST', `/action-items/${actionItemId}/supervisors`, {
      SupervisorId: supervisorId,
    });
  });

  server.registerTool('get_project_details', {
    title: 'Get Project Details',
    description: 'Get full details of a project',
    inputSchema: {
      projectId: z.string().describe('UUID of the project'),
    },
  }, async ({ projectId }) => {
    return makeRequest(API_BASE_URL, 'GET', `/project-details/${projectId}`);
  });

  server.registerTool('list_project_schedules', {
    title: 'List Project Schedules',
    description: 'List project schedules',
    inputSchema: {
      limit: z.number().optional().describe('Items per page (default: 5)'),
    },
  }, async ({ limit }) => {
    return makeRequest(API_BASE_URL, 'GET', '/project-schedules', null, { limit: limit || 5 });
  });

  server.registerTool('get_financial_summary', {
    title: 'Get Financial Summary',
    description: 'Get transaction summary grouped by timeframe',
    inputSchema: {
      groupBy: z.enum(['month', 'year', 'week']).optional().describe('Group by timeframe'),
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format'),
    },
  }, async ({ groupBy, startDate, endDate }) => {
    return makeRequest(API_BASE_URL, 'GET', '/transactions/summary', null, {
      groupBy: groupBy || 'month',
      startDate,
      endDate,
    });
  });

  server.registerTool('get_project_finances', {
    title: 'Get Project Finances',
    description: 'Get financial overview for a specific project',
    inputSchema: {
      projectId: z.string().describe('UUID of the project'),
    },
  }, async ({ projectId }) => {
    const balances = await makeRequest(API_BASE_URL, 'GET', '/job-balances', null, {
      projectId,
    });
    const variance = await makeRequest(API_BASE_URL, 'GET', '/cost-variance', null, {
      projectId,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `JOB BALANCES:\n${balances.content[0].text}\n\nCOST VARIANCE:\n${variance.content[0].text}`,
        },
      ],
    };
  });

  return server.server;
}
