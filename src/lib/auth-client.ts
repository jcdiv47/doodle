import { createAuthClient } from "better-auth/react";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";

function requiredViteEnv(name: "VITE_CONVEX_SITE_URL"): string {
  const value = import.meta.env[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export const authClient = createAuthClient({
  baseURL: requiredViteEnv("VITE_CONVEX_SITE_URL"),
  plugins: [convexClient(), crossDomainClient()],
});

export const oauthProviders = ["github", "google"] as const;

export type OAuthProvider = (typeof oauthProviders)[number];
