import { query, mutation, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { getCurrentUserId, requireCurrentUserId } from "./lib/auth";

const bookmarkFields = v.object({
  _id: v.id("bookmarks"),
  _creationTime: v.number(),
  url: v.string(),
  title: v.string(),
  description: v.string(),
  notes: v.optional(v.string()),
  searchText: v.string(),
  favicon: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  readCount: v.optional(v.number()),
  userId: v.id("users"),
});

export const list = query({
  args: {},
  returns: v.array(bookmarkFields),
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const search = query({
  args: { query: v.string() },
  returns: v.array(bookmarkFields),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("bookmarks")
      .withSearchIndex("search_bookmarks", (q) =>
        q.search("searchText", args.query).eq("userId", userId)
      )
      .collect();
  },
});

export const listTags = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const tagSet = new Set<string>();
    for (const bookmark of bookmarks) {
      if (bookmark.tags) {
        for (const tag of bookmark.tags) {
          tagSet.add(tag);
        }
      }
    }
    return Array.from(tagSet).sort();
  },
});

export const add = mutation({
  args: {
    url: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    favicon: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.union(v.id("bookmarks"), v.null()),
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const url = args.url.trim();
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_url", (q) => q.eq("userId", userId).eq("url", url))
      .unique();
    if (existing) {
      return null;
    }
    const title = args.title || url;
    const description = args.description || "";
    const notes = args.notes?.trim() || undefined;
    const searchText = [url, title, description, notes || ""]
      .filter(Boolean)
      .join(" ");
    const id = await ctx.db.insert("bookmarks", {
      url,
      title,
      description,
      searchText,
      favicon: args.favicon,
      notes,
      userId,
    });
    if (args.title === undefined) {
      await ctx.scheduler.runAfter(0, internal.fetch.fetchMetadata, {
        bookmarkId: id,
        url,
      });
    }
    return id;
  },
});

export const addFromApi = internalMutation({
  args: { url: v.string(), tags: v.optional(v.array(v.string())), userId: v.id("users") },
  returns: v.id("bookmarks"),
  handler: async (ctx, args) => {
    const url = args.url.trim();
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_url", (q) =>
        q.eq("userId", args.userId).eq("url", url)
      )
      .unique();
    if (existing) {
      throw new ConvexError("This URL has already been bookmarked");
    }
    const tags = args.tags
      ? [...new Set(args.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))]
      : undefined;
    const searchText = [url, ...(tags ?? [])].join(" ");

    const id = await ctx.db.insert("bookmarks", {
      url,
      title: url,
      description: "",
      searchText,
      tags: tags && tags.length > 0 ? tags : undefined,
      userId: args.userId,
    });
    await ctx.scheduler.runAfter(0, internal.fetch.fetchMetadata, {
      bookmarkId: id,
      url,
    });
    return id;
  },
});

export const addTag = mutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    tag: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark || bookmark.userId !== userId) return null;
    const tag = args.tag.trim().toLowerCase();
    if (!tag) return null;
    const tags = bookmark.tags ?? [];
    if (tags.includes(tag)) return null;
    const newTags = [...tags, tag];
    const searchText = [bookmark.url, bookmark.title, bookmark.description, bookmark.notes || "", ...newTags]
      .filter(Boolean)
      .join(" ");
    await ctx.db.patch(args.bookmarkId, { tags: newTags, searchText });
    return null;
  },
});

export const removeTag = mutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    tag: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark || bookmark.userId !== userId) return null;
    const tags = bookmark.tags ?? [];
    const newTags = tags.filter((t) => t !== args.tag);
    const searchText = [bookmark.url, bookmark.title, bookmark.description, bookmark.notes || "", ...newTags]
      .filter(Boolean)
      .join(" ");
    await ctx.db.patch(args.bookmarkId, {
      tags: newTags.length > 0 ? newTags : undefined,
      searchText,
    });
    return null;
  },
});

export const updateNotes = mutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    notes: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark || bookmark.userId !== userId) return null;
    const notes = args.notes.trim() || undefined;
    const tags = bookmark.tags ?? [];
    const searchText = [bookmark.url, bookmark.title, bookmark.description, notes || "", ...tags]
      .filter(Boolean)
      .join(" ");
    await ctx.db.patch(args.bookmarkId, { notes, searchText });
    return null;
  },
});

export const trackRead = mutation({
  args: { bookmarkId: v.id("bookmarks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark || bookmark.userId !== userId) return null;
    await ctx.db.patch(args.bookmarkId, {
      readCount: (bookmark.readCount ?? 0) + 1,
    });
    return null;
  },
});

export const remove = mutation({
  args: { bookmarkId: v.id("bookmarks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark || bookmark.userId !== userId) return null;
    await ctx.db.delete(args.bookmarkId);
    return null;
  },
});

export const updateMetadata = internalMutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    title: v.string(),
    description: v.string(),
    favicon: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark) return null;
    const tags = bookmark.tags ?? [];
    const searchText = [bookmark.url, args.title, args.description, bookmark.notes || "", ...tags]
      .filter(Boolean)
      .join(" ");
    await ctx.db.patch(args.bookmarkId, {
      title: args.title,
      description: args.description,
      favicon: args.favicon,
      searchText,
    });
    return null;
  },
});
