import { useMemo, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useCachedQuery } from "./lib/useCachedQuery";
import { BookmarkItem } from "./BookmarkItem";
import type { Id } from "../convex/_generated/dataModel";

export function BookmarkList({
  searchQuery,
  selectedTags,
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
  selectionMode,
  selectedIds,
  onToggleSelection,
  onEnterSelectionMode,
  onExitSelectionMode,
}: {
  searchQuery: string;
  selectedTags: Set<string>;
  sortBy: "createdAt" | "readCount";
  sortOrder: "asc" | "desc";
  onSortByChange: (sortBy: "createdAt" | "readCount") => void;
  onSortOrderChange: (sortOrder: "asc" | "desc") => void;
  selectionMode?: boolean;
  selectedIds?: Set<Id<"bookmarks">>;
  onToggleSelection?: (id: Id<"bookmarks">) => void;
  onEnterSelectionMode?: () => void;
  onExitSelectionMode?: () => void;
}) {
  const trimmed = searchQuery.trim();
  const allBookmarks = useCachedQuery(api.bookmarks.list, trimmed ? "skip" : {}, "bookmarks:list");
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

  // Track which bookmark IDs have been seen so only genuinely new items
  // (e.g. just added by the user) get the entrance animation.
  const seenIdsRef = useRef<Set<string> | null>(null);

  if (bookmarks && seenIdsRef.current === null) {
    // First render with data — mark everything as already seen
    seenIdsRef.current = new Set(bookmarks.map((b) => b._id));
  }

  useEffect(() => {
    if (bookmarks && seenIdsRef.current) {
      for (const b of bookmarks) {
        seenIdsRef.current.add(b._id);
      }
    }
  }, [bookmarks]);

  if (bookmarks === undefined) {
    return (
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
    );
  }

  const allSelected = bookmarks.length > 0 && selectedIds
    ? bookmarks.every((b) => selectedIds.has(b._id))
    : false;

  const handleSelectAll = () => {
    if (!onToggleSelection) return;
    for (const b of bookmarks) {
      if (allSelected) {
        if (selectedIds?.has(b._id)) onToggleSelection(b._id);
      } else {
        if (!selectedIds?.has(b._id)) onToggleSelection(b._id);
      }
    }
  };

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
        <span className="ml-auto inline-flex items-center gap-2">
          {selectionMode && bookmarks.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-zinc-text transition-colors hover:text-amber"
            >
              {allSelected ? "deselect all" : "select all"}
            </button>
          )}
          {selectionMode && (
            <span className="text-zinc-border">|</span>
          )}
          <button
            onClick={() => {
              if (selectionMode) {
                onExitSelectionMode?.();
              } else {
                onEnterSelectionMode?.();
              }
            }}
            className={`transition-colors ${
              selectionMode
                ? "text-amber hover:text-amber/80"
                : "text-zinc-text hover:text-amber"
            }`}
          >
            {selectionMode ? "cancel" : "select"}
          </button>
        </span>
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
              isNew={seenIdsRef.current !== null && !seenIdsRef.current.has(bookmark._id)}
              selectionMode={selectionMode}
              isSelected={selectedIds?.has(bookmark._id)}
              onToggleSelection={onToggleSelection}
            />
          ))}
        </div>
      )}
    </div>
  );
}
