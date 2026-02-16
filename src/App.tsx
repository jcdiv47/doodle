import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from "react";
import {
  useConvexAuth,
} from "convex/react";
import { AddBookmark } from "./AddBookmark";
import { BookmarkList } from "./BookmarkList";
import { TagFilter } from "./TagFilter";
import { SignIn } from "./SignIn";
import { Dashboard } from "./Dashboard";
import { BulkActionBar } from "./BulkActionBar";
import { MemosPage } from "./MemosPage";
import { HomePage } from "./HomePage";
import { UserBadge } from "./UserBadge";
import { authClient } from "./lib/auth-client";
import type { Id } from "../convex/_generated/dataModel";

function usePathname() {
  const pathname = useSyncExternalStore(
    (cb) => {
      window.addEventListener("popstate", cb);
      return () => window.removeEventListener("popstate", cb);
    },
    () => window.location.pathname,
  );
  return pathname;
}

function navigate(path: string) {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function hasOAuthCallbackTokenInUrl() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.has("ott");
}

function hasOAuthErrorInUrl() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.has("error") || params.has("error_description");
}

function BookmarkApp({
  onSignOut,
}: {
  onSignOut: () => Promise<void>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"createdAt" | "readCount">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<Id<"bookmarks">>>(new Set());

  const handleToggleSelection = useCallback((id: Id<"bookmarks">) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleExitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleToggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-charcoal font-sans">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <header className="mb-10 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <a href="/" className="mt-0.5 block h-7 w-7 shrink-0">
              <img src="/logo.svg" alt="" className="h-7 w-7" />
            </a>
            <div>
              <h1 className="font-mono text-2xl font-medium tracking-tight text-white">
                bookmarks
              </h1>
              <p className="mt-1 font-mono text-xs text-zinc-text">
                save. search. retrieve.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/memos")}
              className="font-mono text-sm text-zinc-text transition-colors hover:text-amber"
            >
              memos
            </button>
            {!selectionMode && <AddBookmark />}
            <UserBadge
              onSignOut={onSignOut}
              onNavigateToStats={() => navigate("/dashboard")}
            />
          </div>
        </header>

        <div className="relative mt-8">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-text"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <circle cx="6.5" cy="6.5" r="4.5" />
            <line x1="10" y1="10" x2="14" y2="14" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="search bookmarks..."
            className="w-full border border-zinc-border bg-charcoal-light py-3 pl-11 pr-10 font-mono text-base text-white placeholder-zinc-text outline-none transition-colors focus:border-amber"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-zinc-text transition-colors hover:text-white"
              aria-label="Clear search"
            >
              clear
            </button>
          )}
        </div>

        <TagFilter selectedTags={selectedTags} onToggleTag={handleToggleTag} />

        <BookmarkList
          searchQuery={searchQuery}
          selectedTags={selectedTags}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortByChange={setSortBy}
          onSortOrderChange={setSortOrder}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelection={handleToggleSelection}
          onEnterSelectionMode={() => setSelectionMode(true)}
          onExitSelectionMode={handleExitSelectionMode}
        />
      </div>

      {selectionMode && (
        <BulkActionBar
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds(new Set())}
          onExitSelectionMode={handleExitSelectionMode}
        />
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-charcoal font-sans">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <header className="mb-10 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <img src="/logo.svg" alt="" className="mt-0.5 h-7 w-7" />
            <div>
              <h1 className="font-mono text-2xl font-medium tracking-tight text-white">
                bookmarks
              </h1>
              <p className="mt-1 font-mono text-xs text-zinc-text">
                save. search. retrieve.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-zinc-text/10" />
          </div>
        </header>

        <div className="relative mt-8">
          <div className="w-full border border-zinc-border bg-charcoal-light py-3 pl-11 pr-10">
            <span className="font-mono text-base text-zinc-text/40">search bookmarks...</span>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 h-5" />
          <div className="divide-y divide-zinc-border border border-zinc-border">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="animate-pulse p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-4 w-4 shrink-0 rounded-full bg-zinc-text/10" />
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-4 rounded bg-zinc-text/10" style={{ width: `${40 + i * 8}%` }} />
                      <div className="h-3.5 w-16 rounded bg-zinc-text/5" />
                    </div>
                    <div className="h-3.5 w-3/4 rounded bg-zinc-text/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthenticatedContent({
  onSignOut,
}: {
  onSignOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const shouldRedirectToBookmarks =
    pathname !== "/" &&
    pathname !== "/bookmarks" &&
    pathname !== "/dashboard" &&
    pathname !== "/memos";

  useEffect(() => {
    if (shouldRedirectToBookmarks) {
      navigate("/bookmarks");
    }
  }, [shouldRedirectToBookmarks]);

  if (shouldRedirectToBookmarks) {
    return null;
  }

  if (pathname === "/") {
    return <HomePage onSignOut={onSignOut} onNavigate={navigate} />;
  }

  if (pathname === "/dashboard") {
    return (
      <Dashboard
        onNavigateBack={() => navigate("/bookmarks")}
        onNavigateToMemos={() => navigate("/memos")}
        onSignOut={onSignOut}
      />
    );
  }

  if (pathname === "/memos") {
    return <MemosPage onSignOut={onSignOut} onNavigate={navigate} />;
  }

  return <BookmarkApp onSignOut={onSignOut} />;
}

export default function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const latestAuthStateRef = useRef({ isAuthenticated, isLoading });
  const isProcessingOAuthCallbackRef = useRef(hasOAuthCallbackTokenInUrl());

  latestAuthStateRef.current = { isAuthenticated, isLoading };
  if (hasOAuthCallbackTokenInUrl()) {
    isProcessingOAuthCallbackRef.current = true;
  }
  if (isAuthenticated || hasOAuthErrorInUrl()) {
    isProcessingOAuthCallbackRef.current = false;
  }

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      let stableUnauthedTicks = 0;
      for (let i = 0; i < 120; i++) {
        const latestAuthState = latestAuthStateRef.current;
        if (!latestAuthState.isLoading && !latestAuthState.isAuthenticated) {
          stableUnauthedTicks += 1;
          if (stableUnauthedTicks >= 5) {
            break;
          }
        } else {
          stableUnauthedTicks = 0;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    } catch {
      // noop: users remain on the authenticated screen when sign-out fails.
    } finally {
      setIsSigningOut(false);
    }
  }, []);

  const isProcessingOAuthCallback = isProcessingOAuthCallbackRef.current;
  const hasCachedData = useRef((() => {
    try { return localStorage.getItem("bookmarks:list") !== null; } catch { return false; }
  })()).current;

  if (isSigningOut || isProcessingOAuthCallback) {
    return <LoadingScreen />;
  }

  if (isLoading) {
    if (hasCachedData) {
      return <AuthenticatedContent onSignOut={handleSignOut} />;
    }
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <SignIn />;
  }

  return <AuthenticatedContent onSignOut={handleSignOut} />;
}
