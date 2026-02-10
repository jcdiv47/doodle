import { query, mutation, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";

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
});

export const list = query({
  args: {},
  returns: v.array(bookmarkFields),
  handler: async (ctx) => {
    return await ctx.db
      .query("bookmarks")
      .order("desc")
      .collect();
  },
});

export const search = query({
  args: { query: v.string() },
  returns: v.array(bookmarkFields),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookmarks")
      .withSearchIndex("search_bookmarks", (q) =>
        q.search("searchText", args.query)
      )
      .collect();
  },
});

export const listTags = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const bookmarks = await ctx.db.query("bookmarks").collect();
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
  args: { url: v.string() },
  returns: v.id("bookmarks"),
  handler: async (ctx, args) => {
    const url = args.url.trim();
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_url", (q) => q.eq("url", url))
      .first();
    if (existing) {
      throw new ConvexError("This URL has already been bookmarked");
    }
    const searchText = url;
    const id = await ctx.db.insert("bookmarks", {
      url,
      title: url,
      description: "",
      searchText,
    });
    await ctx.scheduler.runAfter(0, internal.fetch.fetchMetadata, {
      bookmarkId: id,
      url,
    });
    return id;
  },
});

export const addFromApi = internalMutation({
  args: { url: v.string(), tags: v.optional(v.array(v.string())) },
  returns: v.id("bookmarks"),
  handler: async (ctx, args) => {
    const url = args.url.trim();
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_url", (q) => q.eq("url", url))
      .first();
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
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark) return null;
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
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark) return null;
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
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark) return null;
    const notes = args.notes.trim() || undefined;
    const tags = bookmark.tags ?? [];
    const searchText = [bookmark.url, bookmark.title, bookmark.description, notes || "", ...tags]
      .filter(Boolean)
      .join(" ");
    await ctx.db.patch(args.bookmarkId, { notes, searchText });
    return null;
  },
});

export const remove = mutation({
  args: { bookmarkId: v.id("bookmarks") },
  returns: v.null(),
  handler: async (ctx, args) => {
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
