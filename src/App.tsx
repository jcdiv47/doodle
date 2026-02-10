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

        <div className="mt-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="search bookmarks..."
            className="w-full border border-zinc-border bg-charcoal-light px-4 py-3 font-mono text-sm text-white placeholder-zinc-text outline-none transition-colors focus:border-amber"
          />
        </div>

        <TagFilter selectedTags={selectedTags} onToggleTag={handleToggleTag} />

        <BookmarkList searchQuery={searchQuery} selectedTags={selectedTags} />
      </div>
    </div>
  );
}
