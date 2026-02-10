import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  bookmarks: defineTable({
    url: v.string(),
    title: v.string(),
    description: v.string(),
    notes: v.optional(v.string()),
    searchText: v.string(),
    favicon: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    readCount: v.optional(v.number()),
  })
    .index("by_url", ["url"])
    .searchIndex("search_bookmarks", { searchField: "searchText" }),
});
