import { httpRouter } from "convex/server";
import { httpAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import { authComponent, createAuth } from "./auth";
import { sha256Hex } from "./lib/hash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const defaultTimeZone = "Asia/Shanghai";
const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
const offsetTimeZoneRegex = /^([+-])(\d{2}):?(\d{2})\+?$/;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function authenticateRequest(ctx: ActionCtx, request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  if (!token) return null;
  const keyHash = await sha256Hex(token);
  return await ctx.runQuery(internal.apiKeys.lookupByKey, { keyHash });
}

function parseTagFilters(searchParams: URLSearchParams) {
  const tags = new Set<string>();
  const tagValues = [
    ...searchParams.getAll("tag"),
    ...searchParams.getAll("tags"),
  ];
  for (const value of tagValues) {
    for (const rawTag of value.split(",")) {
      const normalized = rawTag.trim().toLowerCase();
      if (normalized) {
        tags.add(normalized);
      }
    }
  }
  return Array.from(tags);
}

function parseDateParts(date: string) {
  const match = dateRegex.exec(date);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() + 1 !== month ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function parseOffsetTimeZoneMinutes(timeZone: string) {
  const match = offsetTimeZoneRegex.exec(timeZone);
  if (!match) {
    return null;
  }
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  if (hours > 23 || minutes > 59) {
    return null;
  }
  return sign * (hours * 60 + minutes);
}

function getNextDateParts(parts: { year: number; month: number; day: number }) {
  const nextDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day) + 24 * 60 * 60 * 1000
  );
  return {
    year: nextDate.getUTCFullYear(),
    month: nextDate.getUTCMonth() + 1,
    day: nextDate.getUTCDate(),
  };
}

function localMidnightToUtcMs(
  parts: { year: number; month: number; day: number },
  timeZone: string
) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const getOffsetMs = (utcMs: number) => {
    const partsMap = new Map<string, string>();
    for (const part of formatter.formatToParts(new Date(utcMs))) {
      if (part.type !== "literal") {
        partsMap.set(part.type, part.value);
      }
    }
    const localYear = Number(partsMap.get("year"));
    const localMonth = Number(partsMap.get("month"));
    const localDay = Number(partsMap.get("day"));
    const localHour = Number(partsMap.get("hour"));
    const localMinute = Number(partsMap.get("minute"));
    const localSecond = Number(partsMap.get("second"));
    const asUtc = Date.UTC(
      localYear,
      localMonth - 1,
      localDay,
      localHour,
      localMinute,
      localSecond
    );
    return asUtc - utcMs;
  };

  let guess = Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0);
  for (let i = 0; i < 3; i += 1) {
    const offsetMs = getOffsetMs(guess);
    const nextGuess =
      Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0) - offsetMs;
    if (nextGuess === guess) {
      break;
    }
    guess = nextGuess;
  }
  return guess;
}

function resolveDateRange(
  date: string,
  timeZone: string
): { startMs: number; endMs: number } | null {
  const dateParts = parseDateParts(date);
  if (!dateParts) {
    return null;
  }

  const nextDateParts = getNextDateParts(dateParts);
  const offsetMinutes = parseOffsetTimeZoneMinutes(timeZone);
  if (offsetMinutes !== null) {
    return {
      startMs:
        Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day) -
        offsetMinutes * 60 * 1000,
      endMs:
        Date.UTC(nextDateParts.year, nextDateParts.month - 1, nextDateParts.day) -
        offsetMinutes * 60 * 1000,
    };
  }

  try {
    return {
      startMs: localMidnightToUtcMs(dateParts, timeZone),
      endMs: localMidnightToUtcMs(nextDateParts, timeZone),
    };
  } catch {
    return null;
  }
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
  path: "/api/bookmarks",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/bookmarks",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const apiKey = await authenticateRequest(ctx, request);
    if (!apiKey) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    const timeZone = url.searchParams.get("timezone") || defaultTimeZone;
    const tags = parseTagFilters(url.searchParams);

    let createdAtStartMs: number | undefined;
    let createdAtEndMs: number | undefined;

    if (date !== null) {
      const range = resolveDateRange(date, timeZone);
      if (!range) {
        return jsonResponse(
          {
            error:
              "\"date\" must be YYYY-MM-DD and \"timezone\" must be a valid IANA timezone or UTC offset like +0800",
          },
          400
        );
      }
      createdAtStartMs = range.startMs;
      createdAtEndMs = range.endMs;
    }

    const bookmarks = await ctx.runQuery(
      internal.bookmarks.listByUserWithFilters,
      {
        userId: apiKey.userId,
        createdAtStartMs,
        createdAtEndMs,
        tags: tags.length > 0 ? tags : undefined,
      }
    );

    return jsonResponse(bookmarks, 200);
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
