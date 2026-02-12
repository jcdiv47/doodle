import { query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { getCurrentUserId } from "./lib/auth";

export const me = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.optional(v.id("users")),
      name: v.string(),
      email: v.string(),
      image: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    const userId = await getCurrentUserId(ctx);
    if (userId) {
      const localUser = await ctx.db.get(userId);
      if (localUser) {
        return {
          _id: localUser._id,
          name: localUser.name ?? authUser.name,
          email: localUser.email ?? authUser.email.toLowerCase(),
          image: localUser.image ?? undefined,
        };
      }
    }

    return {
      _id: undefined,
      name: authUser.name,
      email: authUser.email.toLowerCase(),
      image: authUser.image ?? undefined,
    };
  },
});
