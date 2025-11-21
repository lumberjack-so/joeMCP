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
      description: 'Get a minimal list of proposals with optional project filtering. Returns only name, id, and projectId for each proposal. Use discover or search to find proposals and get full details.',
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
    'list_estimates',
    {
      title: 'List Estimates',
      description: 'Get a minimal list of estimates with optional project filtering. Returns only name, id, and projectId for each estimate. Use get_estimates to retrieve full details for a specific project\'s estimates.',
      inputSchema: {
        projectId: z.string().optional().describe('UUID of project to filter by (optional - if not provided, returns estimates from all projects)'),
        limit: z.number().optional().describe('Items per page (default: 3, max: 10 to prevent token overflow)'),
      },
    },
    async ({ projectId, limit }) => {
      const cappedLimit = Math.min(limit || 3, 10);
      const params: any = { limit: cappedLimit };

      if (projectId) {
        params.projectId = projectId;
      }

      return makeRequest('GET', '/estimates', null, params);
    }
  );

  // ==========================================
  // 3. ACTION ITEMS TOOLS
  // ==========================================

  server.registerTool(
    'list_action_items',
    {
      title: 'List Action Items',
      description: 'Get a minimal list of action items with optional project filtering. Returns only name (title), id, and projectId for each action item. Use get_action_item to retrieve full details for a specific action item.',
      inputSchema: {
        projectId: z.string().optional().describe('UUID of project to filter by (optional - if not provided, returns action items from all projects)'),
        limit: z.number().optional().describe('Items per page (default: 3, max: 10 to prevent token overflow)'),
      },
    },
    async ({ projectId, limit }) => {
      const cappedLimit = Math.min(limit || 3, 10);
      const params: any = { limit: cappedLimit };

      if (projectId) {
        params.projectId = projectId;
      }

      return makeRequest('GET', '/action-items', null, params);
    }
  );

  server.registerTool(
    'get_action_item',
    {
      title: 'Get Action Item',
      description: 'Get full details for a specific action item by ID',
      inputSchema: {
        actionItemId: z.string().describe('The GUID of the action item to retrieve'),
      },
    },
    async ({ actionItemId }) => {
      return makeRequest('GET', '/action-items', null, { actionItemId });
    }
  );

  server.registerTool(
    'create_action_item',
    {
      title: 'Create Action Item',
      description: 'Create a new Action Item. Can be Generic (ActionTypeId=3), Cost Change (ActionTypeId=1), or Schedule Change (ActionTypeId=2). For Cost/Schedule changes, you MUST include the corresponding nested object with all required fields.',
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
        }).optional().describe('Cost change details (REQUIRED when ActionTypeId=1)'),
        ScheduleChange: z.object({
          NoOfDays: z.number().describe('Number of days to adjust schedule'),
          ConstructionTaskId: z.string().describe('UUID of construction task'),
          RequiresClientApproval: z.boolean().describe('Whether client approval is required'),
        }).optional().describe('Schedule change details (REQUIRED when ActionTypeId=2)'),
      },
    },
    async (args) => {
      // Validate CostChange when ActionTypeId=1
      if (args.ActionTypeId === 1 && !args.CostChange) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Error: CostChange object with Amount, EstimateCategoryId, and RequiresClientApproval is REQUIRED when ActionTypeId=1',
            },
          ],
          isError: true,
        };
      }

      // Validate ScheduleChange when ActionTypeId=2
      if (args.ActionTypeId === 2 && !args.ScheduleChange) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Error: ScheduleChange object with NoOfDays, ConstructionTaskId, and RequiresClientApproval is REQUIRED when ActionTypeId=2',
            },
          ],
          isError: true,
        };
      }

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
      description: 'Get a minimal list of all projects. Returns only name, id, and projectId for each project. Use get_project to retrieve full details for a specific project.',
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
    'get_project',
    {
      title: 'Get Project',
      description: 'Get full project details by project ID',
      inputSchema: {
        projectId: z.string().describe('The GUID of the project to retrieve'),
      },
    },
    async ({ projectId }) => {
      return makeRequest('GET', '/projects', null, { projectId });
    }
  );

  server.registerTool(
    'get_schedule',
    {
      title: 'Get Schedule',
      description: 'Get full schedule data for a specific project',
      inputSchema: {
        projectId: z.string().describe('The GUID of the project to retrieve schedule for'),
      },
    },
    async ({ projectId }) => {
      return makeRequest('GET', '/schedules', null, { projectId });
    }
  );

  server.registerTool(
    'list_schedules',
    {
      title: 'List Schedules',
      description: 'Get a minimal list of schedules with optional project filtering. Returns only name, id, and projectId for each schedule.',
      inputSchema: {
        projectId: z.string().optional().describe('Optional project GUID to filter schedules by project'),
        limit: z.number().optional().describe('Optional limit on number of results to return'),
      },
    },
    async ({ projectId, limit }) => {
      const params: any = {};

      if (projectId) {
        params.projectId = projectId;
      }
      if (limit) {
        params.limit = limit;
      }

      return makeRequest('GET', '/schedules', null, params);
    }
  );

  server.registerTool(
    'get_estimates',
    {
      title: 'Get Estimates',
      description: 'Get full estimate data for a specific project',
      inputSchema: {
        projectId: z.string().describe('The GUID of the project to retrieve estimates for'),
      },
    },
    async ({ projectId }) => {
      return makeRequest('GET', '/estimates', null, { projectId });
    }
  );

  server.registerTool(
    'discover',
    {
      title: 'Discover Projects',
      description: 'Discover comprehensive project data by searching for a project and retrieving all related information including project details, financials (estimates, job balances, cost variance), schedules, and action items - all in one unified JSON response',
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

      // Step 2: Fetch all project data in parallel (6 endpoints)
      const [
        projectDetails,
        actionItems,
        estimates,
        schedules,
        jobBalances,
        costVariance,
      ] = await Promise.all([
        makeRequest('GET', '/projects', null, { projectId: resolvedProjectId }),
        makeRequest('GET', '/action-items', null, { projectId: resolvedProjectId }),
        makeRequest('GET', '/estimates', null, { projectId: resolvedProjectId }),
        makeRequest('GET', '/schedules', null, { projectId: resolvedProjectId }),
        makeRequest('GET', '/job-balances', null, { projectId: resolvedProjectId }),
        makeRequest('GET', '/cost-variance', null, { projectId: resolvedProjectId }),
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
          jobBalances: parseResponse(jobBalances),
          costVariance: parseResponse(costVariance),
        },
        schedules: parseResponse(schedules),
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
  // 5. ASYNC AGENT TOOL
  // ==========================================

  server.registerTool(
    'async',
    {
      title: 'Async Agent',
      description: 'Delegate complex multi-step workflows to the async-agent system. Use this for tasks that require multiple coordinated steps, data gathering from multiple sources, or complex orchestration.',
      inputSchema: {
        prompt: z.string().describe('The task or question to send to the async-agent'),
      },
    },
    async ({ prompt }) => {
      const ASYNC_AGENT_BASE_URL = 'https://joeapi-async-agent.fly.dev';
      const TIMEOUT_MS = 120000; // 2 minutes

      try {
        // Prepare payload for async-agent with fixed values
        const payload = {
          prompt: prompt,
          searchWorkflow: true,
          async: false,
        };

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

  // ==========================================
  // 6. FINANCIAL TOOLS
  // ==========================================

  server.registerTool(
    'get_financials',
    {
      title: 'Get Financials',
      description: 'Get comprehensive financial data for a project including job balances and cost variance',
      inputSchema: {
        projectId: z.string().describe('The GUID of the project to retrieve financial data for'),
      },
    },
    async ({ projectId }) => {
      const [jobBalancesResult, costVarianceResult] = await Promise.all([
        makeRequest('GET', '/job-balances', null, { projectId }),
        makeRequest('GET', '/cost-variance', null, { projectId })
      ]);

      // Check for errors in either result
      if (jobBalancesResult.isError) {
        return jobBalancesResult;
      }
      if (costVarianceResult.isError) {
        return costVarianceResult;
      }

      return {
        isError: false,
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            jobBalances: jobBalancesResult.content[0].text,
            costVariance: costVarianceResult.content[0].text
          }, null, 2)
        }]
      };
    }
  );

  server.registerTool(
    'get_transactions',
    {
      title: 'Get Transactions',
      description: 'Get transaction list for a project with optional date range filtering',
      inputSchema: {
        projectId: z.string().describe('The GUID of the project to retrieve transactions for'),
        startDate: z.string().optional().describe('Start date in ISO-8601 format (e.g., 2024-01-01)'),
        endDate: z.string().optional().describe('End date in ISO-8601 format (e.g., 2024-12-31)'),
      },
    },
    async ({ projectId, startDate, endDate }) => {
      const params: Record<string, any> = { projectId };

      if (startDate !== undefined) {
        params.startDate = startDate;
      }
      if (endDate !== undefined) {
        params.endDate = endDate;
      }

      return makeRequest('GET', '/transactions', null, params);
    }
  );

  // ==========================================
  // 7. SEARCH/FIND TOOLS
  // ==========================================

  server.registerTool(
    'find_project',
    {
      title: 'Find Project',
      description: 'Search for projects by name, client name, or other attributes. Returns matching projects with basic info.',
      inputSchema: {
        query: z.string().describe('Search query to find projects'),
      },
    },
    async ({ query }) => {
      return makeRequest('GET', '/search', null, {
        q: query,
        type: 'project'
      });
    }
  );

  server.registerTool(
    'find_estimate',
    {
      title: 'Find Estimate',
      description: 'Search for estimates and estimate categories. Can search across all estimates or within a specific project.',
      inputSchema: {
        query: z.string().describe('Search query to find estimates or categories'),
        projectId: z.string().optional().describe('Optional project GUID to search within specific project for estimate categories'),
      },
    },
    async ({ query, projectId }) => {
      // First search (always)
      const estimateResults = await makeRequest('GET', '/search', null, {
        q: query,
        type: 'estimate'
      });

      if (estimateResults.isError) {
        return estimateResults;
      }

      // If projectId provided, do second search
      if (projectId) {
        const categoryResults = await makeRequest('GET', '/search', null, {
          q: query,
          type: 'estimateCategory',
          projectId
        });

        if (categoryResults.isError) {
          return categoryResults;
        }

        // Combine results
        return {
          isError: false,
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              estimates: JSON.parse(estimateResults.content[0].text),
              categories: JSON.parse(categoryResults.content[0].text)
            }, null, 2)
          }]
        };
      }

      // Return just estimate results if no projectId
      return estimateResults;
    }
  );

  server.registerTool(
    'find_schedule',
    {
      title: 'Find Schedule',
      description: 'Search for schedules and construction tasks. Can search across all schedules or within a specific project.',
      inputSchema: {
        query: z.string().describe('Search query to find schedules or tasks'),
        projectId: z.string().optional().describe('Optional project GUID to search within specific project for construction tasks'),
      },
    },
    async ({ query, projectId }) => {
      // First search (always)
      const scheduleResults = await makeRequest('GET', '/search', null, {
        q: query,
        type: 'schedule'
      });

      if (scheduleResults.isError) {
        return scheduleResults;
      }

      // If projectId provided, do second search
      if (projectId) {
        const taskResults = await makeRequest('GET', '/search', null, {
          q: query,
          type: 'constructionTask',
          projectId
        });

        if (taskResults.isError) {
          return taskResults;
        }

        // Combine results
        return {
          isError: false,
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              schedules: JSON.parse(scheduleResults.content[0].text),
              tasks: JSON.parse(taskResults.content[0].text)
            }, null, 2)
          }]
        };
      }

      // Return just schedule results if no projectId
      return scheduleResults;
    }
  );

  server.registerTool(
    'find_proposal',
    {
      title: 'Find Proposal',
      description: 'Search for proposals by proposal number, title, or description. Can optionally filter by project.',
      inputSchema: {
        query: z.string().describe('Search query to find proposals'),
        projectId: z.string().optional().describe('Optional project GUID to filter proposals by project'),
      },
    },
    async ({ query, projectId }) => {
      const params: any = {
        q: query,
        type: 'proposal'
      };

      // Only add projectId to params if provided
      if (projectId) {
        params.projectId = projectId;
      }

      return makeRequest('GET', '/search', null, params);
    }
  );

  server.registerTool(
    'find_action_items',
    {
      title: 'Find Action Items',
      description: 'Search for action items by title or description. Can optionally filter by project.',
      inputSchema: {
        query: z.string().describe('Search query to find action items'),
        projectId: z.string().optional().describe('Optional project GUID to filter action items by project'),
      },
    },
    async ({ query, projectId }) => {
      const params: any = {
        q: query,
        type: 'action-item'
      };

      // Only add projectId to params if provided
      if (projectId) {
        params.projectId = projectId;
      }

      return makeRequest('GET', '/search', null, params);
    }
  );

  server.registerTool(
    'search',
    {
      title: 'Search',
      description: 'Generic search tool that can search across multiple entity types with optional filtering by project.',
      inputSchema: {
        query: z.string().describe('Search query'),
        type: z.string().optional().describe('Entity type to search: project, estimate, schedule, proposal, estimateCategory, constructionTask, action-item'),
        projectId: z.string().optional().describe('Optional project GUID to filter results by project'),
      },
    },
    async ({ query, type, projectId }) => {
      const params: any = { q: query };

      if (type) {
        params.type = type;
      }
      if (projectId) {
        params.projectId = projectId;
      }

      return makeRequest('GET', '/search', null, params);
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
