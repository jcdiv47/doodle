import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { sha256Hex } from "./lib/hash";
import { getCurrentUserId, requireCurrentUserId } from "./lib/auth";

const MAX_KEYS_PER_USER = 3;
const KEY_PREFIX = "doodl_";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return keys.map((k) => ({
      _id: k._id,
      prefix: k.prefix,
      name: k.name,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
    }));
  },
});

export const generate = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);

    const name = args.name.trim();
    if (!name) throw new ConvexError("Name is required");

    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (existing.length >= MAX_KEYS_PER_USER) {
      throw new ConvexError(`Maximum of ${MAX_KEYS_PER_USER} API keys allowed`);
    }

    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const hex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const plaintext = KEY_PREFIX + hex;

    const keyHash = await sha256Hex(plaintext);
    const prefix = KEY_PREFIX + hex.slice(0, 8);

    await ctx.db.insert("apiKeys", {
      userId,
      keyHash,
      prefix,
      name,
      createdAt: Date.now(),
    });

    return plaintext;
  },
});

export const revoke = mutation({
  args: { keyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);

    const key = await ctx.db.get(args.keyId);
    if (!key || key.userId !== userId) {
      throw new ConvexError("Key not found");
    }

    await ctx.db.delete(args.keyId);
  },
});

export const lookupByKey = internalQuery({
  args: { keyHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_hash", (q) => q.eq("keyHash", args.keyHash))
      .unique();
  },
});

export const recordUsage = internalMutation({
  args: { keyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keyId, { lastUsedAt: Date.now() });
  },
});
