# JoeAPI MCP Server - Tool Documentation

Complete reference for all 18 MCP tools available in the JoeAPI construction management server.

**Base URL:** Configured via `apiBaseUrl` (default: `https://joeapi.fly.dev`)
**API Version:** v1
**All endpoints are prefixed with:** `/api/v1`

---

## Table of Contents

1. [Clients & Contacts](#1-clients--contacts)
   - [list_clients](#list_clients)
   - [create_client](#create_client)
   - [list_contacts](#list_contacts)
   - [create_contact](#create_contact)
2. [Proposals & Estimates](#2-proposals--estimates)
   - [list_proposals](#list_proposals)
   - [get_proposal_details](#get_proposal_details)
   - [list_estimates](#list_estimates)
3. [Action Items](#3-action-items)
   - [list_action_items](#list_action_items)
   - [create_action_item](#create_action_item)
   - [add_action_item_comment](#add_action_item_comment)
   - [assign_action_item_supervisor](#assign_action_item_supervisor)
4. [Projects](#4-projects)
   - [list_projects](#list_projects)
   - [get_project_details](#get_project_details)
   - [list_project_schedules](#list_project_schedules)
   - [search](#search)
5. [Financial](#5-financial)
   - [get_financial_summary](#get_financial_summary)
   - [get_project_finances](#get_project_finances)
6. [Async Agent](#6-async-agent)
   - [async](#async)

---

## 1. Clients & Contacts

### list_clients

Retrieve a paginated list of all clients in the system.

**Input Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number for pagination |
| `limit` | number | No | 5 | Number of items per page (max: 100) |

**API Endpoint:** `GET /api/v1/clients?page={page}&limit={limit}`

**Output Format:**
```json
{
  "data": [
    {
      "id": "uuid",
      "Name": "Client Name",
      "EmailAddress": "client@example.com",
      "CompanyName": "Company Inc.",
      "Phone": "+1-555-0100"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 50
  }
}
```

**Example Usage:**
```javascript
list_clients({ page: 1, limit: 10 })
list_clients({}) // Uses defaults: page=1, limit=5
```

---

### create_client

Create a new client record in the system.

**Input Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes | Full name of the client |
| `EmailAddress` | string | Yes | Client's email address |
| `CompanyName` | string | Yes | Company or organization name |
| `Phone` | string | Yes | Contact phone number |

**API Endpoint:** `POST /api/v1/clients`

**Output Format:**
```json
{
  "id": "uuid",
  "Name": "John Doe",
  "EmailAddress": "john@example.com",
  "CompanyName": "Acme Corp",
  "Phone": "+1-555-0100",
  "createdAt": "2025-01-15T10:30:00Z"
}
```

**Example Usage:**
```javascript
create_client({
  Name: "John Doe",
  EmailAddress: "john@example.com",
  CompanyName: "Acme Corp",
  Phone: "+1-555-0100"
})
```

---

### list_contacts

Retrieve a list of all contacts.

**Input Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 5 | Number of items to return |

**API Endpoint:** `GET /api/v1/contacts?limit={limit}`

**Output Format:**
```json
{
  "data": [
    {
      "id": "uuid",
      "Name": "Jane Smith",
      "Email": "jane@example.com",
      "Phone": "+1-555-0200",
      "City": "San Francisco",
      "State": "CA"
    }
  ]
}
```

**Example Usage:**
```javascript
list_contacts({ limit: 10 })
list_contacts({}) // Uses default: limit=5
```

---

### create_contact

Create a new contact record.

**Input Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes | Contact's full name |
| `Email` | string | Yes | Email address |
| `Phone` | string | Yes | Phone number |
| `City` | string | No | City (optional) |
| `State` | string | No | State/province (optional) |

**API Endpoint:** `POST /api/v1/contacts`

**Output Format:**
```json
{
  "id": "uuid",
  "Name": "Jane Smith",
  "Email": "jane@example.com",
  "Phone": "+1-555-0200",
  "City": "San Francisco",
  "State": "CA",
  "createdAt": "2025-01-15T10:30:00Z"
}
```

**Example Usage:**
```javascript
create_contact({
  Name: "Jane Smith",
  Email: "jane@example.com",
  Phone: "+1-555-0200",
  City: "San Francisco",
  State: "CA"
})

// Without optional fields
create_contact({
  Name: "Bob Johnson",
  Email: "bob@example.com",
  Phone: "+1-555-0300"
})
```

---

## 2. Proposals & Estimates

### list_proposals

List all proposals in the system.

**Input Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 5 | Number of items to return |

**API Endpoint:** `GET /api/v1/proposals?limit={limit}`

**Output Format:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Kitchen Renovation",
      "clientId": "uuid",
      "status": "pending",
      "totalAmount": 45000.00,
      "createdAt": "2025-01-10T09:00:00Z"
    }
  ]
}
```

**Example Usage:**
```javascript
list_proposals({ limit: 20 })
list_proposals({}) // Uses default: limit=5
```

---

### get_proposal_details

Get detailed information about a specific proposal, optionally including line items.

**Input Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `proposalId` | string | Yes | - | UUID of the proposal |
| `includeLines` | boolean | No | false | Fetch proposal line items in separate request |

**API Endpoints:**
- `GET /api/v1/proposals/{proposalId}` (always called)
- `GET /api/v1/proposallines?proposalId={proposalId}` (if includeLines=true)

**Behavior:**
- If `includeLines=false`: Returns only proposal data
- If `includeLines=true`: Makes two API calls and combines results

**Output Format (includeLines=false):**
```json
{
  "id": "uuid",
  "title": "Kitchen Renovation",
  "clientId": "uuid",
  "description": "Complete kitchen remodel",
  "status": "approved",
  "totalAmount": 45000.00
}
```

**Output Format (includeLines=true):**
```
PROPOSAL:
{
  "id": "uuid",
  "title": "Kitchen Renovation",
  ...
}

LINES:
{
  "data": [
    {
      "id": "uuid",
      "description": "Cabinet installation",
      "quantity": 12,
      "unitPrice": 500.00,
      "total": 6000.00
    }
  ]
}
```

**Example Usage:**
```javascript
// Just proposal details
get_proposal_details({ proposalId: "abc-123-def" })

// With line items
get_proposal_details({
  proposalId: "abc-123-def",
  includeLines: true
})
```

---

### list_estimates

List all project estimates.

**Input Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 5 | Number of items to return |

**API Endpoint:** `GET /api/v1/estimates?limit={limit}`

**Output Format:**
```json
{
  "data": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "category": "Labor",
      "estimatedCost": 25000.00,
      "actualCost": 23500.00,
      "variance": -1500.00
    }
  ]
}
```

**Example Usage:**
```javascript
list_estimates({ limit: 50 })
list_estimates({}) // Uses default: limit=5
```

---

## 3. Action Items

### list_action_items

List action items for a specific project.

**Input Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectId` | string | Yes | - | UUID of the project |
| `limit` | number | No | 5 | Number of items to return |

**API Endpoint:** `GET /api/v1/action-items?projectId={projectId}&limit={limit}`

**Output Format:**
```json
{
  "data": [
    {
      "id": "uuid",
      "Title": "Order materials",
      "Description": "Order cabinets from supplier",
      "ProjectId": "uuid",
      "ActionTypeId": 3,
      "DueDate": "2025-01-20",
      "Status": 1,
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

**Example Usage:**
```javascript
list_action_items({
  projectId: "abc-123-def",
  limit: 10
})
```

---

### create_action_item

Create a new action item. Supports three types: Generic, Cost Change, or Schedule Change.

**Input Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Title` | string | Yes | Action item title |
| `Description` | string | Yes | Detailed description |
| `ProjectId` | string | Yes | UUID of the project |
| `ActionTypeId` | number | Yes | 1=CostChange, 2=ScheduleChange, 3=Generic |
| `DueDate` | string | Yes | ISO date format (YYYY-MM-DD) |
| `Status` | number | No | Status code (default: 1) |
| `Source` | number | No | Source code (default: 1) |
| `InitialComment` | string | No | Initial comment text |
| `CostChange` | object | Conditional | Required if ActionTypeId=1 (see below) |
| `ScheduleChange` | object | Conditional | Required if ActionTypeId=2 (see below) |

**CostChange Object (required if ActionTypeId=1):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `Amount` | number | Yes | Cost change amount (positive or negative) |
| `EstimateCategoryId` | string | Yes | UUID of estimate category |
| `RequiresClientApproval` | boolean | Yes | Whether client approval needed |

**ScheduleChange Object (required if ActionTypeId=2):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `NoOfDays` | number | Yes | Number of days to adjust (positive or negative) |
| `ConstructionTaskId` | string | Yes | UUID of construction task |
| `RequiresClientApproval` | boolean | Yes | Whether client approval needed |

**API Endpoint:** `POST /api/v1/action-items`

**Example Usage:**

**Generic Action Item:**
```javascript
create_action_item({
  Title: "Order materials",
  Description: "Order cabinets from supplier XYZ",
  ProjectId: "abc-123-def",
  ActionTypeId: 3,
  DueDate: "2025-01-20",
  InitialComment: "Urgent - needed by next week"
})
```

**Cost Change Action Item:**
```javascript
create_action_item({
  Title: "Additional electrical work",
  Description: "Client requested additional outlets",
  ProjectId: "abc-123-def",
  ActionTypeId: 1,
  DueDate: "2025-01-25",
  CostChange: {
    Amount: 1500.00,
    EstimateCategoryId: "xyz-789-ghi",
    RequiresClientApproval: true
  }
})
```

**Schedule Change Action Item:**
```javascript
create_action_item({
  Title: "Weather delay",
  Description: "Rain delayed exterior work",
  ProjectId: "abc-123-def",
  ActionTypeId: 2,
  DueDate: "2025-01-22",
  ScheduleChange: {
    NoOfDays: 3,
    ConstructionTaskId: "task-456-jkl",
    RequiresClientApproval: false
  }
})
```

---

### add_action_item_comment

Add a comment to an existing action item.

**Input Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `actionItemId` | string | Yes | UUID of the action item |
| `comment` | string | Yes | Comment text |

**API Endpoint:** `POST /api/v1/action-items/{actionItemId}/comments`

**Request Body:**
```json
{
  "Comment": "Updated status with supplier"
}
```

**Example Usage:**
```javascript
add_action_item_comment({
  actionItemId: "item-123-abc",
  comment: "Materials have been ordered and will arrive Friday"
})
```

---

### assign_action_item_supervisor

Assign a supervisor to an action item for oversight.

**Input Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `actionItemId` | string | Yes | UUID of the action item |
| `supervisorId` | number | Yes | User ID of the supervisor |

**API Endpoint:** `POST /api/v1/action-items/{actionItemId}/supervisors`

**Request Body:**
```json
{
  "SupervisorId": 42
}
```

**Example Usage:**
```javascript
assign_action_item_supervisor({
  actionItemId: "item-123-abc",
  supervisorId: 42
})
```

---

## 4. Projects

### list_projects

List all projects with pagination.

**Input Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 5 | Items per page (max: 100) |

**API Endpoint:** `GET /api/v1/project-details?page={page}&limit={limit}`

**Output Format:**
```json
{
  "data": [
    {
      "projectId": "uuid",
      "name": "Main Street Renovation",
      "status": "active",
      "startDate": "2025-01-01",
      "estimatedCompletion": "2025-06-30",
      "budget": 150000.00
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 45
  }
}
```

**Example Usage:**
```javascript
list_projects({ page: 2, limit: 20 })
list_projects({}) // Uses defaults: page=1, limit=5
```

---

### get_project_details

Get comprehensive details for a specific project.

**Input Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | string | Yes | UUID of the project |

**API Endpoint:** `GET /api/v1/project-details/{projectId}`

**Output Format:**
```json
{
  "projectId": "uuid",
  "name": "Main Street Renovation",
  "description": "Complete building renovation",
  "status": "active",
  "clientId": "uuid",
  "startDate": "2025-01-01",
  "estimatedCompletion": "2025-06-30",
  "budget": 150000.00,
  "actualCost": 75000.00,
  "progress": 45
}
```

**Example Usage:**
```javascript
get_project_details({ projectId: "abc-123-def" })
```

---

### list_project_schedules

List all project schedules across all projects.

**Input Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 5 | Number of items to return |

**API Endpoint:** `GET /api/v1/project-schedules?limit={limit}`

**Output Format:**
```json
{
  "data": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "taskName": "Foundation work",
      "startDate": "2025-01-15",
      "endDate": "2025-02-15",
      "status": "in_progress"
    }
  ]
}
```

**Example Usage:**
```javascript
list_project_schedules({ limit: 25 })
list_project_schedules({}) // Uses default: limit=5
```

---

### search

**⭐ POWER TOOL** - Search for a project and retrieve comprehensive data from 6 different endpoints in a single call.

**Input Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query (searches project name, description, status) |
| `projectId` | string | No | Direct project ID (skips search if provided) |

**Execution Flow:**

1. **Search Step** (if `projectId` not provided):
   - Calls `GET /api/v1/search?q={query}`
   - Takes first matching project
   - Extracts `projectId` from result

2. **Parallel Data Fetch** (6 simultaneous API calls):
   - `GET /api/v1/transactions?projectId={id}`
   - `GET /api/v1/action-items?projectId={id}`
   - `GET /api/v1/estimates?projectId={id}`
   - `GET /api/v1/schedules?projectId={id}`
   - `GET /api/v1/schedule-revisions?projectId={id}`
   - `GET /api/v1/estimates/revision-history?projectId={id}`

3. **Aggregation**:
   - Combines all 6 data sources
   - Formats with section headers
   - Returns unified response

**Output Format:**
```
PROJECT SEARCH RESULTS (Project ID: abc-123-def)

TRANSACTIONS:
{
  "data": [...]
}

---

ACTION ITEMS:
{
  "data": [...]
}

---

ESTIMATES:
{
  "data": [...]
}

---

SCHEDULES:
{
  "data": [...]
}

---

SCHEDULE REVISIONS:
{
  "data": [...]
}

---

ESTIMATE REVISIONS:
{
  "data": [...]
}
```

**Error Handling:**
- If no projects match query: Returns error "No project found matching query"
- If search endpoint fails: Returns API error
- Individual section errors are included in output (doesn't fail entire request)

**Performance:**
- **With search:** 7 total API calls (1 search + 6 parallel fetches)
- **Direct projectId:** 6 total API calls (parallel fetches only)
- All 6 data fetches happen simultaneously via `Promise.all`

**Example Usage:**

**Search by name:**
```javascript
search({ query: "Kitchen Remodel" })
// Searches for project, then fetches all data
```

**Direct lookup (faster):**
```javascript
search({
  query: "ignored", // Required but not used
  projectId: "abc-123-def"
})
// Skips search, directly fetches all data
```

**Use Cases:**
- Get complete project snapshot in one call
- Analyze project status across multiple dimensions
- Prepare comprehensive project reports
- When you need transactions, estimates, schedules, and revisions together

---

## 5. Financial

### get_financial_summary

Get aggregated transaction summary grouped by time period.

**Input Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `groupBy` | enum | No | 'month' | Grouping: 'month', 'year', or 'week' |
| `startDate` | string | Yes | - | Start date (YYYY-MM-DD) |
| `endDate` | string | Yes | - | End date (YYYY-MM-DD) |

**API Endpoint:** `GET /api/v1/transactions/summary?groupBy={groupBy}&startDate={start}&endDate={end}`

**Output Format:**
```json
{
  "summary": [
    {
      "period": "2025-01",
      "totalRevenue": 125000.00,
      "totalExpenses": 98000.00,
      "netProfit": 27000.00,
      "transactionCount": 156
    },
    {
      "period": "2025-02",
      "totalRevenue": 143000.00,
      "totalExpenses": 105000.00,
      "netProfit": 38000.00,
      "transactionCount": 189
    }
  ],
  "totals": {
    "revenue": 268000.00,
    "expenses": 203000.00,
    "profit": 65000.00
  }
}
```

**Example Usage:**

**Monthly summary:**
```javascript
get_financial_summary({
  groupBy: "month",
  startDate: "2025-01-01",
  endDate: "2025-12-31"
})
```

**Weekly summary:**
```javascript
get_financial_summary({
  groupBy: "week",
  startDate: "2025-01-01",
  endDate: "2025-03-31"
})
```

**Yearly summary:**
```javascript
get_financial_summary({
  groupBy: "year",
  startDate: "2020-01-01",
  endDate: "2025-12-31"
})
```

---

### get_project_finances

Get financial overview for a specific project by fetching both job balances and cost variance.

**Input Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | string | Yes | UUID of the project |

**API Endpoints (called in parallel):**
- `GET /api/v1/job-balances?projectId={id}`
- `GET /api/v1/cost-variance?projectId={id}`

**Behavior:**
- Makes 2 parallel API calls
- Combines results into single formatted response

**Output Format:**
```
JOB BALANCES:
{
  "projectId": "abc-123-def",
  "totalBilled": 85000.00,
  "totalPaid": 75000.00,
  "outstandingBalance": 10000.00,
  "retainageHeld": 5000.00
}

COST VARIANCE:
{
  "projectId": "abc-123-def",
  "categories": [
    {
      "category": "Labor",
      "estimated": 50000.00,
      "actual": 48500.00,
      "variance": -1500.00,
      "variancePercent": -3.0
    },
    {
      "category": "Materials",
      "estimated": 35000.00,
      "actual": 38200.00,
      "variance": 3200.00,
      "variancePercent": 9.14
    }
  ],
  "totals": {
    "estimated": 85000.00,
    "actual": 86700.00,
    "variance": 1700.00
  }
}
```

**Example Usage:**
```javascript
get_project_finances({ projectId: "abc-123-def" })
```

**Use Cases:**
- Analyze project profitability
- Track budget vs actual costs
- Review outstanding invoices
- Financial reporting

---

## 6. Async Agent

### async

**⚡ ADVANCED TOOL** - Delegate complex multi-step workflows to an external async-agent system.

**Input Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Task or question for the async-agent |
| `callId` | string | No | Optional tracking ID (auto-generated if not provided) |

**External Service:** `https://joeapi-async-agent.fly.dev/webhooks/prompt`

**Behavior:**
- Makes HTTP POST request to external async-agent webhook
- Timeout: 120 seconds (2 minutes)
- Uses AbortController for timeout enforcement
- Automatically includes `searchWorkflow: true` in payload

**Request Payload:**
```json
{
  "prompt": "Analyze all projects with cost overruns > 10%",
  "searchWorkflow": true,
  "callId": "optional-tracking-id"
}
```

**Output Format (Success):**
```json
{
  "callId": "generated-or-provided-id",
  "status": "completed",
  "result": {
    "analysis": "...",
    "recommendations": [...]
  }
}
```

**Error Handling:**
- **Timeout (>120s):** Returns `Async-agent timeout: Request exceeded 120 seconds`
- **HTTP Error:** Returns `Async-agent error ({status}): {errorText}`
- **Network Error:** Returns `Async-agent error: {errorMessage}`

**Example Usage:**

**Simple delegation:**
```javascript
async({
  prompt: "Find all projects behind schedule and summarize delays"
})
```

**With tracking ID:**
```javascript
async({
  prompt: "Generate quarterly financial report",
  callId: "report-q1-2025"
})
```

**Use Cases:**
- Complex workflows requiring multiple tool calls
- Data analysis across multiple projects
- Report generation
- Tasks requiring orchestration of multiple API endpoints
- When a single tool isn't sufficient for the task

**Important Notes:**
- This tool calls an **external service** (not JoeAPI directly)
- May take longer than other tools (up to 2 minutes)
- Best for complex tasks that would require multiple sequential tool calls
- The async-agent has its own set of capabilities and tools

---

## Response Format Standards

All tools return data in a consistent MCP response format:

**Success Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{JSON data or formatted text}"
    }
  ]
}
```

**Error Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Error message description"
    }
  ],
  "isError": true
}
```

---

## Common Response Codes

**HTTP Status Codes from JoeAPI:**
- `200` - Success
- `201` - Created (POST requests)
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

**MCP Tool Error Messages:**
- `API Error {status}: {details}` - JoeAPI returned an error
- `Network Error: {message}` - Connection or network issue
- `No project found matching query` - Search returned no results
- `Error parsing search results` - Invalid JSON from search endpoint

---

## Best Practices

### Pagination
- Always specify `limit` for large datasets
- Use `page` parameter to navigate through results
- Default limits are conservative (5 items) - increase for batch operations

### Performance
- Use `search` tool instead of multiple individual calls when you need comprehensive project data
- Provide `projectId` directly to `search` if known (skips search API call)
- `get_project_finances` is optimized with parallel fetching

### Error Handling
- Check for `isError: true` in responses
- Search tool includes individual section errors without failing entire request
- Async tool has 2-minute timeout - use for long-running tasks only

### Data Relationships
- `projectId` links projects to action items, estimates, schedules, etc.
- `clientId` links clients to projects and proposals
- Use UUIDs for all entity references

---

## Configuration

**Environment Variables (STDIO mode):**
```bash
JOEAPI_BASE_URL=https://joeapi.fly.dev
JOEAPI_API_KEY=your_api_key  # Optional
```

**Smithery Configuration:**
- Set `apiBaseUrl` in Smithery dashboard
- Default: `https://joeapi.fly.dev`
- For local dev: `http://localhost:8080`

---

## Rate Limits & Quotas

Check with your JoeAPI instance administrator for:
- API rate limits
- Maximum `limit` values for pagination
- Concurrent request limits

The `search` tool makes 6-7 concurrent requests, so ensure your API can handle parallel connections.

---

## Support & Documentation

- **MCP Server Code:** `index.ts`
- **Architecture Docs:** `CLAUDE.md`
- **Migration Guide:** `migration.md`
- **JoeAPI Backend:** Contact your system administrator for API schema

---

**Last Updated:** 2025-11-20
**MCP Server Version:** 1.0.0
**Total Tools:** 18
