import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";

function getInitialOAuthError(): string | null {
  const params = new URLSearchParams(window.location.search);
  if (params.has("oauth")) {
    params.delete("oauth");
    const qs = params.toString();
    window.history.replaceState(
      {},
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
    return "you are not allowed to sign up at the moment.";
  }
  return null;
}

export function SignIn() {
  const { signIn } = useAuthActions();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(getInitialOAuthError);

  const handleOAuth = (provider: string) => {
    setError(null);
    setLoading(provider);
    void signIn(provider, { redirectTo: "/?oauth=1" }).catch((e) => {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      setLoading(null);
    });
  };

  return (
    <div className="min-h-screen bg-charcoal font-sans">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <img src="/logo.svg" alt="" className="h-7 w-7" />
              <h1 className="font-mono text-2xl font-medium tracking-tight text-white">
                bookmarks
              </h1>
            </div>
            <p className="font-mono text-xs text-zinc-text">
              sign in to continue
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleOAuth("github")}
              disabled={loading !== null}
              className="flex w-full items-center justify-center gap-3 border border-zinc-border bg-charcoal-light py-3 font-mono text-sm text-white transition-colors hover:border-zinc-text disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              {loading === "github" ? "redirecting..." : "continue with github"}
            </button>

            <button
              onClick={() => handleOAuth("google")}
              disabled={loading !== null}
              className="flex w-full items-center justify-center gap-3 border border-zinc-border bg-charcoal-light py-3 font-mono text-sm text-white transition-colors hover:border-zinc-text disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16">
                <path fill="#4285F4" d="M15.68 8.18c0-.57-.05-1.11-.15-1.64H8v3.1h4.31a3.68 3.68 0 01-1.6 2.42v2.01h2.59c1.51-1.39 2.38-3.44 2.38-5.89z" />
                <path fill="#34A853" d="M8 16c2.16 0 3.97-.72 5.3-1.94l-2.59-2.01c-.72.48-1.63.76-2.71.76-2.08 0-3.85-1.41-4.48-3.3H.85v2.07A7.999 7.999 0 008 16z" />
                <path fill="#FBBC05" d="M3.52 9.52a4.8 4.8 0 010-3.04V4.41H.85a8 8 0 000 7.18l2.67-2.07z" />
                <path fill="#EA4335" d="M8 3.18c1.17 0 2.23.4 3.06 1.2l2.29-2.3A7.97 7.97 0 008 0 7.999 7.999 0 00.85 4.41l2.67 2.07C4.15 4.59 5.92 3.18 8 3.18z" />
              </svg>
              {loading === "google" ? "redirecting..." : "continue with google"}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-center font-mono text-xs text-red-400">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
