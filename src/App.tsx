import { useState, useCallback } from "react";
import { AddBookmark } from "./AddBookmark";
import { BookmarkList } from "./BookmarkList";
import { TagFilter } from "./TagFilter";

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

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
        <header className="mb-10">
          <h1 className="font-mono text-2xl font-medium tracking-tight text-white">
            bookmarks
          </h1>
          <p className="mt-1 font-mono text-xs text-zinc-text">
            save. search. retrieve.
          </p>
        </header>

        <AddBookmark />

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
            className="w-full border border-zinc-border bg-charcoal-light py-3 pl-11 pr-10 font-mono text-sm text-white placeholder-zinc-text outline-none transition-colors focus:border-amber"
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

        <BookmarkList searchQuery={searchQuery} selectedTags={selectedTags} />
      </div>
    </div>
  );
}
