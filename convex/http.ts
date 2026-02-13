import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import { authComponent, createAuth } from "./auth";
import { sha256Hex } from "./lib/hash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: object | string[], status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function authenticateRequest(ctx: any, request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  if (!token) return null;
  const keyHash = await sha256Hex(token);
  return await ctx.runQuery(internal.apiKeys.lookupByKey, { keyHash });
}

const http = httpRouter();
authComponent.registerRoutes(http, createAuth, { cors: true });

http.route({
  path: "/api/bookmark",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/bookmark",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const apiKey = await authenticateRequest(ctx, request);
    if (!apiKey) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const contentType = request.headers.get("Content-Type");
    if (!contentType || !contentType.includes("application/json")) {
      return jsonResponse({ error: "Content-Type must be application/json" }, 400);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "Request body must be a JSON object" }, 400);
    }

    const { url, tags, notes } = body as { url?: unknown; tags?: unknown; notes?: unknown };

    if (typeof url !== "string" || !url.trim()) {
      return jsonResponse({ error: "\"url\" must be a non-empty string" }, 400);
    }

    if (tags !== undefined) {
      if (!Array.isArray(tags) || !tags.every((t) => typeof t === "string")) {
        return jsonResponse({ error: "\"tags\" must be an array of strings" }, 400);
      }
    }

    if (notes !== undefined && typeof notes !== "string") {
      return jsonResponse({ error: "\"notes\" must be a string" }, 400);
    }

    try {
      const id = await ctx.runMutation(internal.bookmarks.addFromApi, {
        url: url as string,
        tags: tags as string[] | undefined,
        notes: notes as string | undefined,
        userId: apiKey.userId,
      });

      await ctx.runMutation(internal.apiKeys.recordUsage, { keyId: apiKey._id });

      return jsonResponse({ id, url: (url as string).trim() }, 201);
    } catch (e) {
      if (e instanceof ConvexError) {
        return jsonResponse({ error: e.data as string }, 409);
      }
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  }),
});

http.route({
  path: "/api/tags",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/tags",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const apiKey = await authenticateRequest(ctx, request);
    if (!apiKey) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const tags = await ctx.runQuery(internal.bookmarks.listTagsByUser, {
      userId: apiKey.userId,
    });

    return jsonResponse(tags, 200);
  }),
});

http.route({
  path: "/api/urls",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/urls",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const apiKey = await authenticateRequest(ctx, request);
    if (!apiKey) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const urls = await ctx.runQuery(internal.bookmarks.listUrlsByUser, {
      userId: apiKey.userId,
    });

    return jsonResponse(urls, 200);
  }),
});

export default http;
