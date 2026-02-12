import { createClient } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";
import type { GenericCtx } from "@convex-dev/better-auth";
import type { DataModel } from "./_generated/dataModel";
import { components } from "./_generated/api";
import authConfig from "./auth.config";

const signupDisabled = process.env.SIGNUP_DISABLED === "true";

function env(name: string): string | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requiredEnv(name: string): string {
  const value = env(name);
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

const siteUrl = env("SITE_URL") ?? env("VITE_SITE_URL") ?? "http://localhost:5173";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    database: authComponent.adapter(ctx),
    baseURL: requiredEnv("CONVEX_SITE_URL"),
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["github", "google"],
        allowDifferentEmails: false,
        updateUserInfoOnLink: true,
      },
    },
    socialProviders: {
      github: {
        clientId: requiredEnv("AUTH_GITHUB_ID"),
        clientSecret: requiredEnv("AUTH_GITHUB_SECRET"),
        disableSignUp: signupDisabled,
      },
      google: {
        clientId: requiredEnv("AUTH_GOOGLE_ID"),
        clientSecret: requiredEnv("AUTH_GOOGLE_SECRET"),
        disableSignUp: signupDisabled,
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (signupDisabled) {
              return false;
            }
            return {
              data: {
                ...user,
                email: user.email.toLowerCase(),
              },
            };
          },
        },
      },
    },
    trustedOrigins: [siteUrl],
    plugins: [
      convex({
        authConfig,
      }),
      crossDomain({ siteUrl }),
    ],
  } satisfies BetterAuthOptions);

export const { getAuthUser } = authComponent.clientApi();
