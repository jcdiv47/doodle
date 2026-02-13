import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import "./index.css";
import App from "./App";
import { authClient } from "./lib/auth-client";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <App />
      <Analytics />
      <SpeedInsights />
    </ConvexBetterAuthProvider>
  </StrictMode>
);
