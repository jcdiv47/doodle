import { useState, useCallback, useRef, useEffect } from "react";
import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useConvexAuth,
  useQuery,
} from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../convex/_generated/api";
import { AddBookmark } from "./AddBookmark";
import { BookmarkList } from "./BookmarkList";
import { TagFilter } from "./TagFilter";
import { SignIn } from "./SignIn";
import { ApiKeySettings } from "./ApiKeySettings";

function UserBadge() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.me);
  const [open, setOpen] = useState(false);
  const [apiKeysOpen, setApiKeysOpen] = useState(false);
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
              setApiKeysOpen(true);
              setOpen(false);
            }}
            className="w-full px-4 py-2.5 text-left font-mono text-xs text-zinc-text transition-colors hover:bg-charcoal hover:text-white"
          >
            api keys
          </button>
          <button
            onClick={() => void signOut()}
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
    </div>
  );
}

function BookmarkApp() {
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
            <UserBadge />
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

function AuthenticatedContent() {
  const user = useQuery(api.users.me);

  if (user === undefined) return <LoadingScreen />;
  return <BookmarkApp />;
}

export default function App() {
  const { isAuthenticated } = useConvexAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const hasCodeParam = searchParams.has("code");
  const hasOAuthParam = searchParams.has("oauth");
  const [oauthGraceExpired, setOAuthGraceExpired] = useState(false);

  // Clean up OAuth query params once the session is established.
  useEffect(() => {
    if (!isAuthenticated) return;
    const url = new URL(window.location.href);
    const hadOAuthParams =
      url.searchParams.has("code") ||
      url.searchParams.has("state") ||
      url.searchParams.has("oauth");
    if (!hadOAuthParams) return;

    url.searchParams.delete("code");
    url.searchParams.delete("state");
    url.searchParams.delete("oauth");
    window.history.replaceState({}, "", url.toString());
  }, [isAuthenticated]);

  useEffect(() => {
    setOAuthGraceExpired(false);
  }, [hasOAuthParam]);

  useEffect(() => {
    if (isAuthenticated || !hasOAuthParam) return;
    const timeoutId = window.setTimeout(() => {
      setOAuthGraceExpired(true);
    }, 3500);
    return () => window.clearTimeout(timeoutId);
  }, [isAuthenticated, hasOAuthParam]);

  const pendingOAuth =
    !isAuthenticated && (hasCodeParam || (hasOAuthParam && !oauthGraceExpired));

  return (
    <>
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>
      <Unauthenticated>
        {pendingOAuth ? <LoadingScreen /> : <SignIn />}
      </Unauthenticated>
      <Authenticated>
        <AuthenticatedContent />
      </Authenticated>
    </>
  );
}
