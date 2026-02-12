import { useState, useCallback, useRef, useEffect } from "react";
import {
  useConvexAuth,
  useQuery,
} from "convex/react";
import { api } from "../convex/_generated/api";
import { AddBookmark } from "./AddBookmark";
import { BookmarkList } from "./BookmarkList";
import { TagFilter } from "./TagFilter";
import { SignIn } from "./SignIn";
import { ApiKeySettings } from "./ApiKeySettings";
import { PasskeySettings } from "./PasskeySettings";
import { authClient } from "./lib/auth-client";

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

function UserBadge({
  onSignOut,
}: {
  onSignOut: () => Promise<void>;
}) {
  const user = useQuery(api.users.me);
  const [open, setOpen] = useState(false);
  const [apiKeysOpen, setApiKeysOpen] = useState(false);
  const [passkeysOpen, setPasskeysOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const name = user?.name ?? user?.email ?? "user";
  const initials = name.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-zinc-border transition-colors hover:border-amber"
      >
        {user?.image ? (
          <img
            src={user.image}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="font-mono text-xs font-medium text-zinc-text">
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 border border-zinc-border bg-charcoal-light shadow-lg">
          <div className="border-b border-zinc-border px-4 py-3">
            {user?.name && (
              <p className="truncate font-mono text-sm text-white">
                {user.name}
              </p>
            )}
            {user?.email && (
              <p className="truncate font-mono text-xs text-zinc-text">
                {user.email}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              setPasskeysOpen(true);
              setOpen(false);
            }}
            className="w-full px-4 py-2.5 text-left font-mono text-xs text-zinc-text transition-colors hover:bg-charcoal hover:text-white"
          >
            passkeys
          </button>
          <button
            onClick={() => {
              setApiKeysOpen(true);
              setOpen(false);
            }}
            className="w-full px-4 py-2.5 text-left font-mono text-xs text-zinc-text transition-colors hover:bg-charcoal hover:text-white"
          >
            api keys
          </button>
          <button
            onClick={() => void onSignOut()}
            className="w-full px-4 py-2.5 text-left font-mono text-xs text-zinc-text transition-colors hover:bg-charcoal hover:text-white"
          >
            sign out
          </button>
        </div>
      )}
      <ApiKeySettings
        isOpen={apiKeysOpen}
        onClose={() => setApiKeysOpen(false)}
      />
      <PasskeySettings
        isOpen={passkeysOpen}
        onClose={() => setPasskeysOpen(false)}
      />
    </div>
  );
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
            <AddBookmark />
            <UserBadge onSignOut={onSignOut} />
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
        />
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal">
      <div className="font-mono text-sm text-zinc-text">loading...</div>
    </div>
  );
}

function AuthenticatedContent({
  onSignOut,
}: {
  onSignOut: () => Promise<void>;
}) {
  const user = useQuery(api.users.me);

  if (user === undefined) return <LoadingScreen />;
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

  if (isLoading || isSigningOut || isProcessingOAuthCallback) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <SignIn />;
  }

  return <AuthenticatedContent onSignOut={handleSignOut} />;
}
