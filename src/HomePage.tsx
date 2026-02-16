import { api } from "../convex/_generated/api";
import { AddBookmark } from "./AddBookmark";
import { UserBadge } from "./UserBadge";
import { useCachedQuery } from "./lib/useCachedQuery";

function SiteSkeleton() {
  return (
    <div className="aspect-square animate-pulse border border-zinc-border bg-charcoal-light p-3">
      <div className="flex h-full flex-col items-center justify-center gap-2.5">
        <div className="h-6 w-6 rounded bg-zinc-text/10" />
        <div className="h-3.5 w-2/3 rounded bg-zinc-text/10" />
      </div>
    </div>
  );
}

function AddSiteTile() {
  return (
    <AddBookmark
      ariaLabel="Add site"
      label={(
        <span className="flex h-full flex-col items-center justify-center gap-2.5 text-center">
          <span className="font-mono text-xl leading-none text-amber">+</span>
          <span className="font-mono text-xs text-amber">Add site</span>
        </span>
      )}
      className="aspect-square w-full border border-zinc-border bg-charcoal-light p-3 transition-colors hover:border-amber/60 hover:bg-charcoal-lighter"
    />
  );
}

export function HomePage({
  onSignOut,
  onNavigate,
}: {
  onSignOut: () => Promise<void>;
  onNavigate: (path: string) => void;
}) {
  const bookmarks = useCachedQuery(api.bookmarks.list, {}, "bookmarks:list");
  const tileGridStyle = {
    gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
  } as const;

  return (
    <div className="min-h-screen bg-charcoal font-sans">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <a href="/" className="mt-0.5 block h-7 w-7 shrink-0">
              <img src="/logo.svg" alt="" className="h-7 w-7" />
            </a>
            <div>
              <h1 className="font-mono text-2xl font-medium tracking-tight text-white">
                doodle
              </h1>
              <p className="mt-1 font-mono text-xs text-zinc-text">
                have fun doodling
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => onNavigate("/bookmarks")}
              className="font-mono text-sm text-zinc-text transition-colors hover:text-amber"
            >
              bookmarks
            </button>
            <button
              onClick={() => onNavigate("/memos")}
              className="font-mono text-sm text-zinc-text transition-colors hover:text-amber"
            >
              memos
            </button>
            <UserBadge onSignOut={onSignOut} onNavigateToStats={() => onNavigate("/dashboard")} />
          </div>
        </header>

        {bookmarks === undefined ? (
          <div className="grid gap-3" style={tileGridStyle}>
            {Array.from({ length: 9 }, (_, i) => (
              <SiteSkeleton key={i} />
            ))}
            <AddSiteTile />
          </div>
        ) : (
          <div className="grid gap-3" style={tileGridStyle}>
            {bookmarks.map((bookmark, index) => (
              <a
                key={bookmark._id}
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-square animate-fade-in-up border border-zinc-border bg-charcoal-light p-3 transition-colors hover:border-amber/60 hover:bg-charcoal-lighter"
                style={{ animationDelay: `${index * 25}ms` }}
              >
                <div className="flex h-full flex-col items-center justify-center gap-2.5 text-center">
                  {bookmark.favicon ? (
                    <img
                      src={bookmark.favicon}
                      alt=""
                      className="h-6 w-6 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <svg
                      className="h-6 w-6 shrink-0 text-zinc-text"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    >
                      <circle cx="8" cy="8" r="6.5" />
                      <ellipse cx="8" cy="8" rx="3" ry="6.5" />
                      <line x1="1.5" y1="8" x2="14.5" y2="8" />
                    </svg>
                  )}
                  <div className="w-full">
                    <p className="line-clamp-2 font-mono text-xs text-white">
                      {bookmark.title}
                    </p>
                  </div>
                </div>
              </a>
            ))}
            <AddSiteTile />
          </div>
        )}
      </div>
    </div>
  );
}
