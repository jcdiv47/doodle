import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUserId, requireCurrentUserId } from "./lib/auth";

const memoFields = v.object({
  _id: v.id("memos"),
  _creationTime: v.number(),
  content: v.string(),
  tags: v.array(v.string()),
  searchText: v.string(),
  hasNsfw: v.boolean(),
  isPinned: v.boolean(),
  updatedAt: v.number(),
  userId: v.id("users"),
});

export const list = query({
  args: {},
  returns: v.array(memoFields),
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("memos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const listTags = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];
    return collectTags(ctx, userId);
  },
});

export const add = mutation({
  args: {
    content: v.string(),
  },
  returns: v.id("memos"),
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const content = normalizeContent(args.content);
    const tags = extractTagsFromContent(content);
    const now = Date.now();
    return await ctx.db.insert("memos", {
      content,
      tags,
      searchText: buildSearchText(content, tags),
      hasNsfw: hasNsfwLine(content),
      isPinned: false,
      updatedAt: now,
      userId,
    });
  },
});

export const update = mutation({
  args: {
    memoId: v.id("memos"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const memo = await ctx.db.get(args.memoId);
    if (!memo || memo.userId !== userId) return null;

    const content = normalizeContent(args.content);
    const tags = extractTagsFromContent(content);
    await ctx.db.patch(args.memoId, {
      content,
      tags,
      searchText: buildSearchText(content, tags),
      hasNsfw: hasNsfwLine(content),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const togglePin = mutation({
  args: {
    memoId: v.id("memos"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const memo = await ctx.db.get(args.memoId);
    if (!memo || memo.userId !== userId) return null;
    await ctx.db.patch(args.memoId, {
      isPinned: !memo.isPinned,
    });
    return null;
  },
});

export const remove = mutation({
  args: {
    memoId: v.id("memos"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const memo = await ctx.db.get(args.memoId);
    if (!memo || memo.userId !== userId) return null;
    await ctx.db.delete(args.memoId);
    return null;
  },
});

function normalizeContent(value: string) {
  const content = value.trim();
  if (!content) {
    throw new ConvexError("Memo content is required");
  }
  return content;
}

function extractTagsFromContent(content: string) {
  const tagSet = new Set<string>();
  const tagPattern = /(^|[^A-Za-z0-9_-])#([A-Za-z0-9_-]+)/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(content)) !== null) {
    tagSet.add(match[2].toLowerCase());
  }

  return Array.from(tagSet).sort();
}

function buildSearchText(content: string, tags: string[]) {
  return [content, ...tags].join(" ").toLowerCase();
}

function hasNsfwLine(content: string) {
  return content
    .split("\n")
    .some((line) => line.trim().toLowerCase() === "#nsfw");
}

async function collectTags(ctx: QueryCtx, userId: Id<"users">) {
  const memos = await ctx.db
    .query("memos")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const tagSet = new Set<string>();
  for (const memo of memos) {
    for (const tag of memo.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
}
