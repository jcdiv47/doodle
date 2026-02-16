import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    authUserId: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("by_auth_user_id", ["authUserId"]),

  apiKeys: defineTable({
    userId: v.id("users"),
    keyHash: v.string(),
    prefix: v.string(),
    name: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_hash", ["keyHash"]),

  bookmarks: defineTable({
    url: v.string(),
    title: v.string(),
    description: v.string(),
    notes: v.optional(v.string()),
    searchText: v.string(),
    favicon: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    readCount: v.optional(v.number()),
    userId: v.id("users"),
  })
    .index("by_url", ["url"])
    .index("by_user", ["userId"])
    .index("by_user_url", ["userId", "url"])
    .searchIndex("search_bookmarks", {
      searchField: "searchText",
      filterFields: ["userId"],
    }),

  navigations: defineTable({
    title: v.string(),
    url: v.string(),
    description: v.string(),
    favicon: v.optional(v.string()),
    position: v.optional(v.number()),
    userId: v.id("users"),
  })
    .index("by_user", ["userId"])
    .index("by_user_url", ["userId", "url"]),

  memos: defineTable({
    content: v.string(),
    tags: v.array(v.string()),
    searchText: v.string(),
    hasNsfw: v.boolean(),
    isPinned: v.boolean(),
    updatedAt: v.number(),
    userId: v.id("users"),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_pinned", ["userId", "isPinned"]),
});
