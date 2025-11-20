#!/usr/bin/env node

/**
 * JoeAPI MCP Server - Migrated to Smithery HTTP Transport
 *
 * Exposes JoeAPI construction management REST API as MCP tools.
 * Provides direct access to clients, contacts, proposals, estimates,
 * action items, projects, and financial data.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Export config schema for Smithery
export const configSchema = z.object({
  apiBaseUrl: z.string().url().default('https://joeapi.fly.dev').describe('Base URL for JoeAPI backend'),
  requestTimeout: z.number().optional().default(30000).describe('Request timeout in milliseconds'),
  apiKey: z.string().optional().describe('API key for authentication (if required)'),
});

// Export default createServer function for Smithery
export default function createServer({ config }: { config: z.infer<typeof configSchema> }) {
  const API_BASE_URL = config.apiBaseUrl;

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

  // Create MCP Server using new McpServer API
  const server = new McpServer({
    name: 'joe-api-server',
    version: '1.0.0',
  });

  // ==========================================
  // 1. CLIENTS & CONTACTS TOOLS
  // ==========================================

  server.registerTool(
    'list_clients',
    {
      title: 'List Clients',
      description: 'Retrieve a paginated list of clients',
      inputSchema: {
        page: z.number().optional().describe('Page number (default: 1)'),
        limit: z.number().optional().describe('Items per page (default: 5, max: 100)'),
      },
    },
    async ({ page, limit }) => {
      return makeRequest('GET', '/clients', null, {
        page: page || 1,
        limit: limit || 5,
      });
    }
  );

  server.registerTool(
    'create_client',
    {
      title: 'Create Client',
      description: 'Create a new client record',
      inputSchema: {
        Name: z.string().describe('Client name'),
        EmailAddress: z.string().describe('Client email address'),
        CompanyName: z.string().describe('Company name'),
        Phone: z.string().describe('Phone number'),
      },
    },
    async (args) => {
      return makeRequest('POST', '/clients', args);
    }
  );

  server.registerTool(
    'list_contacts',
    {
      title: 'List Contacts',
      description: 'Retrieve a list of contacts',
      inputSchema: {
        limit: z.number().optional().describe('Items per page (default: 5)'),
      },
    },
    async ({ limit }) => {
      return makeRequest('GET', '/contacts', null, {
        limit: limit || 5,
      });
    }
  );

  server.registerTool(
    'create_contact',
    {
      title: 'Create Contact',
      description: 'Create a new contact',
      inputSchema: {
        Name: z.string().describe('Contact name'),
        Email: z.string().describe('Email address'),
        Phone: z.string().describe('Phone number'),
        City: z.string().optional().describe('City (optional)'),
        State: z.string().optional().describe('State (optional)'),
      },
    },
    async (args) => {
      return makeRequest('POST', '/contacts', args);
    }
  );

  // ==========================================
  // 2. PROPOSALS & ESTIMATES TOOLS
  // ==========================================

  server.registerTool(
    'list_proposals',
    {
      title: 'List Proposals',
      description: 'List all proposals',
      inputSchema: {
        limit: z.number().optional().describe('Items per page (default: 5)'),
      },
    },
    async ({ limit }) => {
      return makeRequest('GET', '/proposals', null, {
        limit: limit || 5,
      });
    }
  );

  server.registerTool(
    'get_proposal_details',
    {
      title: 'Get Proposal Details',
      description: 'Get specific proposal details including lines',
      inputSchema: {
        proposalId: z.string().describe('UUID of the proposal'),
        includeLines: z.boolean().optional().describe('If true, fetches proposal lines in a separate request (default: false)'),
      },
    },
    async ({ proposalId, includeLines }) => {
      const proposal = await makeRequest('GET', `/proposals/${proposalId}`);

      if (includeLines && !proposal.isError) {
        const lines = await makeRequest('GET', '/proposallines', null, {
          proposalId: proposalId,
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

  server.registerTool(
    'list_estimates',
    {
      title: 'List Estimates',
      description: 'List all estimates',
      inputSchema: {
        limit: z.number().optional().describe('Items per page (default: 5)'),
      },
    },
    async ({ limit }) => {
      return makeRequest('GET', '/estimates', null, {
        limit: limit || 5,
      });
    }
  );

  // ==========================================
  // 3. ACTION ITEMS TOOLS
  // ==========================================

  server.registerTool(
    'list_action_items',
    {
      title: 'List Action Items',
      description: 'List action items for a specific project',
      inputSchema: {
        projectId: z.string().describe('UUID of the project'),
        limit: z.number().optional().describe('Items per page (default: 5)'),
      },
    },
    async ({ projectId, limit }) => {
      return makeRequest('GET', '/action-items', null, {
        projectId: projectId,
        limit: limit || 5,
      });
    }
  );

  server.registerTool(
    'create_action_item',
    {
      title: 'Create Action Item',
      description: 'Create a new Action Item. Can be Generic (ActionTypeId=3), Cost Change (ActionTypeId=1), or Schedule Change (ActionTypeId=2). For Cost/Schedule changes, include the corresponding nested object.',
      inputSchema: {
        Title: z.string().describe('Action item title'),
        Description: z.string().describe('Action item description'),
        ProjectId: z.string().describe('UUID of the project'),
        ActionTypeId: z.number().describe('1=CostChange, 2=ScheduleChange, 3=Generic'),
        DueDate: z.string().describe('ISO Date YYYY-MM-DD'),
        Status: z.number().optional().describe('Status code (default: 1)'),
        Source: z.number().optional().describe('Source code (default: 1)'),
        InitialComment: z.string().optional().describe('Initial comment (optional)'),
        CostChange: z.object({
          Amount: z.number().describe('Cost change amount'),
          EstimateCategoryId: z.string().describe('UUID of estimate category'),
          RequiresClientApproval: z.boolean().describe('Whether client approval is required'),
        }).optional().describe('Cost change details (required if ActionTypeId=1)'),
        ScheduleChange: z.object({
          NoOfDays: z.number().describe('Number of days to adjust schedule'),
          ConstructionTaskId: z.string().describe('UUID of construction task'),
          RequiresClientApproval: z.boolean().describe('Whether client approval is required'),
        }).optional().describe('Schedule change details (required if ActionTypeId=2)'),
      },
    },
    async (args) => {
      // Always ensure Status and Source are set to 1 if not provided
      const payload = {
        ...args,
        Status: args.Status ?? 1,
        Source: args.Source ?? 1,
      };
      return makeRequest('POST', '/action-items', payload);
    }
  );

  server.registerTool(
    'add_action_item_comment',
    {
      title: 'Add Action Item Comment',
      description: 'Add a comment to an action item',
      inputSchema: {
        actionItemId: z.string().describe('Action item ID'),
        comment: z.string().describe('Comment text'),
      },
    },
    async ({ actionItemId, comment }) => {
      return makeRequest('POST', `/action-items/${actionItemId}/comments`, {
        Comment: comment,
      });
    }
  );

  server.registerTool(
    'assign_action_item_supervisor',
    {
      title: 'Assign Action Item Supervisor',
      description: 'Assign a supervisor to an action item',
      inputSchema: {
        actionItemId: z.string().describe('Action item ID'),
        supervisorId: z.number().describe('Supervisor user ID'),
      },
    },
    async ({ actionItemId, supervisorId }) => {
      return makeRequest('POST', `/action-items/${actionItemId}/supervisors`, {
        SupervisorId: supervisorId,
      });
    }
  );

  // ==========================================
  // 4. PROJECTS TOOLS
  // ==========================================

  server.registerTool(
    'list_projects',
    {
      title: 'List Projects',
      description: 'List all projects with pagination',
      inputSchema: {
        page: z.number().optional().describe('Page number (default: 1)'),
        limit: z.number().optional().describe('Items per page (default: 5, max: 100)'),
      },
    },
    async ({ page, limit }) => {
      return makeRequest('GET', '/project-details', null, {
        page: page || 1,
        limit: limit || 5,
      });
    }
  );

  server.registerTool(
    'get_project_details',
    {
      title: 'Get Project Details',
      description: 'Get full details of a project',
      inputSchema: {
        projectId: z.string().describe('UUID of the project'),
      },
    },
    async ({ projectId }) => {
      return makeRequest('GET', `/project-details/${projectId}`);
    }
  );

  server.registerTool(
    'list_project_schedules',
    {
      title: 'List Project Schedules',
      description: 'List project schedules',
      inputSchema: {
        limit: z.number().optional().describe('Items per page (default: 5)'),
      },
    },
    async ({ limit }) => {
      return makeRequest('GET', '/project-schedules', null, {
        limit: limit || 5,
      });
    }
  );

  server.registerTool(
    'search',
    {
      title: 'Search Projects',
      description: 'Search for a project and get comprehensive structured data including project details, financials (estimates, estimate revisions, transactions), schedules (current and revisions), and action items - all in one unified JSON response',
      inputSchema: {
        query: z.string().describe('Search query to find the project (searches in project name, description, status)'),
        projectId: z.string().optional().describe('Optional: Direct project ID if already known (skips search step)'),
      },
    },
    async ({ query, projectId }) => {
      let resolvedProjectId = projectId;

      // Step 1: If no projectId provided, use the new /search endpoint
      if (!resolvedProjectId) {
        const searchResponse = await makeRequest('GET', '/search', null, {
          q: query,
        });

        if (searchResponse.isError) {
          return searchResponse;
        }

        // Parse the response to get first matching project
        try {
          const searchData = JSON.parse(searchResponse.content[0].text);
          const projects = searchData.data || [];

          if (projects.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `No project found matching query: "${query}"`,
                },
              ],
              isError: true,
            };
          }

          // Use first match
          resolvedProjectId = projects[0].projectId;
        } catch (error: any) {
          return {
            content: [
              {
                type: 'text',
                text: `Error parsing search results: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      // Step 2: Fetch all project data in parallel (7 endpoints)
      const [
        projectDetails,
        transactions,
        actionItems,
        estimates,
        schedules,
        scheduleRevisions,
        estimateRevisions,
      ] = await Promise.all([
        makeRequest('GET', `/project-details/${resolvedProjectId}`),
        makeRequest('GET', '/transactions', null, { projectId: resolvedProjectId }),
        makeRequest('GET', '/action-items', null, { projectId: resolvedProjectId }),
        makeRequest('GET', '/estimates', null, { projectId: resolvedProjectId }),
        makeRequest('GET', '/schedules', null, { projectId: resolvedProjectId }),
        makeRequest('GET', '/schedule-revisions', null, { projectId: resolvedProjectId }),
        makeRequest('GET', '/estimates/revision-history', null, { projectId: resolvedProjectId }),
      ]);

      // Step 3: Parse JSON responses and build structured object
      const parseResponse = (response: any) => {
        if (response.isError) {
          return { error: response.content[0].text };
        }
        try {
          return JSON.parse(response.content[0].text);
        } catch (error) {
          return { error: 'Failed to parse response' };
        }
      };

      const structuredData = {
        projectId: resolvedProjectId,
        project: parseResponse(projectDetails),
        financials: {
          estimates: parseResponse(estimates),
          estimateRevisionHistory: parseResponse(estimateRevisions),
          transactions: parseResponse(transactions),
        },
        schedules: {
          current: parseResponse(schedules),
          revisions: parseResponse(scheduleRevisions),
        },
        actionItems: parseResponse(actionItems),
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(structuredData, null, 2),
          },
        ],
      };
    }
  );

  // ==========================================
  // 5. FINANCIAL TOOLS
  // ==========================================

  server.registerTool(
    'get_financial_summary',
    {
      title: 'Get Financial Summary',
      description: 'Get transaction summary grouped by timeframe',
      inputSchema: {
        groupBy: z.enum(['month', 'year', 'week']).optional().describe('Group by: month, year, or week (default: month)'),
        startDate: z.string().describe('Start date in YYYY-MM-DD format'),
        endDate: z.string().describe('End date in YYYY-MM-DD format'),
      },
    },
    async ({ groupBy, startDate, endDate }) => {
      return makeRequest('GET', '/transactions/summary', null, {
        groupBy: groupBy || 'month',
        startDate: startDate,
        endDate: endDate,
      });
    }
  );

  server.registerTool(
    'get_project_finances',
    {
      title: 'Get Project Finances',
      description: 'Get financial overview for a specific project (Job Balances and Cost Variance)',
      inputSchema: {
        projectId: z.string().describe('UUID of the project'),
      },
    },
    async ({ projectId }) => {
      const balances = await makeRequest('GET', '/job-balances', null, {
        projectId: projectId,
      });
      const variance = await makeRequest('GET', '/cost-variance', null, {
        projectId: projectId,
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

  // ==========================================
  // 6. ASYNC AGENT TOOL
  // ==========================================

  server.registerTool(
    'async',
    {
      title: 'Async Agent',
      description: 'Delegate complex multi-step workflows to the async-agent system. Use this for tasks that require multiple coordinated steps, data gathering from multiple sources, or complex orchestration.',
      inputSchema: {
        prompt: z.string().describe('The task or question to send to the async-agent'),
        callId: z.string().optional().describe('Optional call ID for tracking (if null, will be auto-generated)'),
      },
    },
    async ({ prompt, callId }) => {
      const ASYNC_AGENT_BASE_URL = 'https://joeapi-async-agent.fly.dev';
      const TIMEOUT_MS = 120000; // 2 minutes

      try {
        // Prepare payload for async-agent
        const payload: any = {
          prompt: prompt,
          searchWorkflow: true,
        };

        // Include callId if provided
        if (callId) {
          payload.callId = callId;
        }

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        // Call async-agent webhook
        const response = await fetch(`${ASYNC_AGENT_BASE_URL}/webhooks/prompt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: 'text',
                text: `Async-agent error (${response.status}): ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const data = await response.json();

        // Return formatted response
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return {
            content: [
              {
                type: 'text',
                text: `Async-agent timeout: Request exceeded ${TIMEOUT_MS / 1000} seconds`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Async-agent error: ${error.message || String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server.server;
}

// Main function for STDIO compatibility
async function main() {
  const apiBaseUrl = process.env.JOEAPI_BASE_URL || 'https://joeapi.fly.dev';
  const apiKey = process.env.JOEAPI_API_KEY;

  const server = createServer({
    config: { apiBaseUrl, requestTimeout: 30000, apiKey },
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('JoeAPI MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
