import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId, requireCurrentUserId } from "./lib/auth";

const navigationFields = v.object({
  _id: v.id("navigations"),
  _creationTime: v.number(),
  title: v.string(),
  url: v.string(),
  description: v.string(),
  favicon: v.optional(v.string()),
  position: v.optional(v.number()),
  userId: v.id("users"),
});

function sortNavigations<T extends { position?: number; _creationTime: number }>(
  items: T[]
) {
  return [...items].sort((a, b) => {
    const aPosition = a.position ?? Number.MAX_SAFE_INTEGER;
    const bPosition = b.position ?? Number.MAX_SAFE_INTEGER;
    if (aPosition !== bPosition) {
      return aPosition - bPosition;
    }
    return b._creationTime - a._creationTime;
  });
}

export const list = query({
  args: {},
  returns: v.array(navigationFields),
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];
    const navigations = await ctx.db
      .query("navigations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return sortNavigations(navigations);
  },
});

export const add = mutation({
  args: {
    url: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    favicon: v.optional(v.string()),
  },
  returns: v.union(v.id("navigations"), v.null()),
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const url = args.url.trim();
    if (!url) return null;

    const existing = await ctx.db
      .query("navigations")
      .withIndex("by_user_url", (q) => q.eq("userId", userId).eq("url", url))
      .unique();
    if (existing) {
      return null;
    }

    const title = args.title?.trim() || url;
    const description = args.description?.trim() || "";
    const existingNavigations = await ctx.db
      .query("navigations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const orderedNavigations = sortNavigations(existingNavigations);
    const maxPosition = orderedNavigations.reduce(
      (max, navigation, index) => Math.max(max, navigation.position ?? index),
      -1
    );

    return await ctx.db.insert("navigations", {
      title,
      url,
      description,
      favicon: args.favicon,
      position: maxPosition + 1,
      userId,
    });
  },
});

export const reorder = mutation({
  args: {
    orderedIds: v.array(v.id("navigations")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const allNavigations = await ctx.db
      .query("navigations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const byId = new Map(allNavigations.map((navigation) => [navigation._id, navigation]));
    const seen = new Set<string>();
    let position = 0;

    for (const navigationId of args.orderedIds) {
      const navigation = byId.get(navigationId);
      if (!navigation || navigation.userId !== userId) {
        continue;
      }
      await ctx.db.patch(navigationId, { position });
      seen.add(navigationId);
      position += 1;
    }

    const remainingNavigations = sortNavigations(
      allNavigations.filter((navigation) => !seen.has(navigation._id))
    );
    for (const navigation of remainingNavigations) {
      await ctx.db.patch(navigation._id, { position });
      position += 1;
    }

    return null;
  },
});
