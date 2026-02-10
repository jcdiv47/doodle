import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { BookmarkItem } from "./BookmarkItem";

export function BookmarkList({
  searchQuery,
  selectedTags,
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
}: {
  searchQuery: string;
  selectedTags: Set<string>;
  sortBy: "createdAt" | "readCount";
  sortOrder: "asc" | "desc";
  onSortByChange: (sortBy: "createdAt" | "readCount") => void;
  onSortOrderChange: (sortOrder: "asc" | "desc") => void;
}) {
  const trimmed = searchQuery.trim();
  const allBookmarks = useQuery(api.bookmarks.list, trimmed ? "skip" : {});
  const searchResults = useQuery(
    api.bookmarks.search,
    trimmed ? { query: trimmed } : "skip"
  );

  const rawBookmarks = trimmed ? searchResults : allBookmarks;

  const bookmarks = useMemo(() => {
    if (!rawBookmarks) return rawBookmarks;

    let filtered = rawBookmarks;
    if (selectedTags.size > 0) {
      filtered = rawBookmarks.filter((bookmark) => {
        const tags = bookmark.tags ?? [];
        return Array.from(selectedTags).every((t) => tags.includes(t));
      });
    }

    const sorted = [...filtered].sort((a, b) => {
      let cmp: number;
      if (sortBy === "readCount") {
        cmp = (a.readCount ?? 0) - (b.readCount ?? 0);
      } else {
        cmp = a._creationTime - b._creationTime;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [rawBookmarks, selectedTags, sortBy, sortOrder]);

  if (bookmarks === undefined) {
    return (
      <div className="mt-8 font-mono text-sm text-zinc-text">loading...</div>
    );
  }

  const sortOptions = [
    { key: "createdAt" as const, label: "date" },
    { key: "readCount" as const, label: "reads" },
  ];

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-1.5 font-mono text-sm">
        <span className="mr-1 text-zinc-text">sort:</span>
        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onSortByChange(opt.key)}
            className={`px-1 transition-colors ${
              sortBy === opt.key
                ? "text-amber"
                : "text-zinc-text hover:text-white/70"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={() =>
            onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")
          }
          className="px-1 text-zinc-text transition-colors hover:text-white/70"
          aria-label={sortOrder === "asc" ? "Ascending" : "Descending"}
        >
          {sortOrder === "asc" ? "\u2191" : "\u2193"}
        </button>
      </div>

      {bookmarks.length === 0 ? (
        <div className="border border-dashed border-zinc-border p-8 text-center font-mono text-sm text-zinc-text">
          {selectedTags.size > 0
            ? "no bookmarks match the selected tags"
            : trimmed
              ? "no results found"
              : "no bookmarks yet \u2014 add one above"}
        </div>
      ) : (
        <div className="divide-y divide-zinc-border border border-zinc-border">
          {bookmarks.map((bookmark, index) => (
            <BookmarkItem
              key={bookmark.url}
              bookmark={bookmark}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
