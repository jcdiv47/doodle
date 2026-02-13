import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";

type AuthUser = NonNullable<
  Awaited<ReturnType<typeof authComponent.safeGetAuthUser>>
>;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function findByAuthUserId(
  ctx: QueryCtx | MutationCtx,
  authUserId: string,
): Promise<Doc<"users"> | null> {
  return await ctx.db
    .query("users")
    .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUserId))
    .unique();
}

async function findByEmail(
  ctx: QueryCtx | MutationCtx,
  email: string,
): Promise<Doc<"users"> | null> {
  return await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .unique();
}

function userPatchFromAuth(authUser: AuthUser): {
  authUserId: string;
  name: string;
  email: string;
  image: string | undefined;
} {
  return {
    authUserId: authUser._id,
    name: authUser.name,
    email: normalizeEmail(authUser.email),
    image: authUser.image ?? undefined,
  };
}

function needsPatch(existing: Doc<"users">, next: ReturnType<typeof userPatchFromAuth>): boolean {
  return (
    existing.authUserId !== next.authUserId ||
    existing.name !== next.name ||
    existing.email !== next.email ||
    existing.image !== next.image
  );
}

export async function getCurrentUserId(ctx: QueryCtx): Promise<Id<"users"> | null> {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) {
    return null;
  }

  const byAuthUserId = await findByAuthUserId(ctx, authUser._id);
  if (byAuthUserId) {
    return byAuthUserId._id;
  }

  const email = normalizeEmail(authUser.email);
  const byEmail = await findByEmail(ctx, email);
  if (byEmail) {
    return byEmail._id;
  }

  return null;
}

export async function requireCurrentUserId(ctx: MutationCtx): Promise<Id<"users">> {
  const authUser = await authComponent.getAuthUser(ctx);
  const next = userPatchFromAuth(authUser);

  const byAuthUserId = await findByAuthUserId(ctx, authUser._id);
  if (byAuthUserId) {
    if (needsPatch(byAuthUserId, next)) {
      await ctx.db.patch(byAuthUserId._id, next);
    }
    return byAuthUserId._id;
  }

  const byEmail = await findByEmail(ctx, next.email);
  if (byEmail) {
    if (needsPatch(byEmail, next)) {
      await ctx.db.patch(byEmail._id, next);
    }
    return byEmail._id;
  }

  return await ctx.db.insert("users", next);
}

