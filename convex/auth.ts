import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import type { DataModel } from "./_generated/dataModel";
import type { GenericDatabaseReader } from "convex/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub, Google],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) {
        // Existing user signing in — always allow
        return args.existingUserId;
      }

      // Normalize email to lowercase for consistent matching and storage.
      const rawEmail = args.profile.email as string | undefined;
      const email = rawEmail?.toLowerCase();

      // Check if a user with this email already exists (account linking).
      // Cast needed because the callback ctx.db is untyped by convex-auth.
      if (email) {
        const db = ctx.db as unknown as GenericDatabaseReader<DataModel>;
        const existingUser = await db
          .query("users")
          .withIndex("email", (q) => q.eq("email", email))
          .unique();
        if (existingUser) {
          return existingUser._id;
        }
      }

      // New user sign-up — block and let client render a graceful message
      // after redirecting back to the sign-in page.
      if (process.env.SIGNUP_DISABLED === "true") {
        throw new Error("Signup is disabled");
      }

      const profile = email
        ? { ...args.profile, email }
        : args.profile;
      return await ctx.db.insert("users", profile);
    },
  },
});
