#!/usr/bin/env node
/**
 * JoeAPI MCP Server
 *
 * Exposes JoeAPI construction management REST API as MCP tools.
 * Connects to any JoeAPI instance via JOEAPI_BASE_URL configuration.
 */
import { z } from 'zod';
export declare const configSchema: z.ZodObject<{
    JOEAPI_BASE_URL: z.ZodString;
    DEFAULT_PAGE_LIMIT: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    REQUEST_TIMEOUT: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    DEBUG_MODE: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    JOEAPI_BASE_URL: string;
    DEFAULT_PAGE_LIMIT?: number | undefined;
    REQUEST_TIMEOUT?: number | undefined;
    DEBUG_MODE?: boolean | undefined;
}, {
    JOEAPI_BASE_URL: string;
    DEFAULT_PAGE_LIMIT?: number | undefined;
    REQUEST_TIMEOUT?: number | undefined;
    DEBUG_MODE?: boolean | undefined;
}>;
export default function createServer({ config }: {
    config: z.infer<typeof configSchema>;
}): import("@modelcontextprotocol/sdk/server").Server<{
    method: string;
    params?: {
        [x: string]: unknown;
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
        } | undefined;
    } | undefined;
}, {
    method: string;
    params?: {
        [x: string]: unknown;
        _meta?: {
            [x: string]: unknown;
        } | undefined;
    } | undefined;
}, {
    [x: string]: unknown;
    _meta?: {
        [x: string]: unknown;
    } | undefined;
}>;
//# sourceMappingURL=index.d.ts.map