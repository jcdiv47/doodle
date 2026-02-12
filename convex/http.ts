import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import { auth } from "./auth";
import { sha256Hex } from "./lib/hash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const http = httpRouter();
auth.addHttpRoutes(http);

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
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.slice("Bearer ".length);
    if (!token) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const keyHash = await sha256Hex(token);
    const apiKey = await ctx.runQuery(internal.apiKeys.lookupByKey, { keyHash });
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

    const { url, tags } = body as { url?: unknown; tags?: unknown };

    if (typeof url !== "string" || !url.trim()) {
      return jsonResponse({ error: "\"url\" must be a non-empty string" }, 400);
    }

    if (tags !== undefined) {
      if (!Array.isArray(tags) || !tags.every((t) => typeof t === "string")) {
        return jsonResponse({ error: "\"tags\" must be an array of strings" }, 400);
      }
    }

    try {
      const id = await ctx.runMutation(internal.bookmarks.addFromApi, {
        url: url as string,
        tags: tags as string[] | undefined,
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

export default http;
