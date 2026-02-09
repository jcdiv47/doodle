import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { BookmarkItem } from "./BookmarkItem";

export function BookmarkList({ searchQuery }: { searchQuery: string }) {
  const trimmed = searchQuery.trim();
  const allBookmarks = useQuery(api.bookmarks.list, trimmed ? "skip" : {});
  const searchResults = useQuery(
    api.bookmarks.search,
    trimmed ? { query: trimmed } : "skip"
  );

  const bookmarks = trimmed ? searchResults : allBookmarks;

  if (bookmarks === undefined) {
    return (
      <div className="mt-8 font-mono text-sm text-zinc-text">loading...</div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="mt-8 border border-dashed border-zinc-border p-8 text-center font-mono text-sm text-zinc-text">
        {trimmed ? "no results found" : "no bookmarks yet — add one above"}
      </div>
    );
  }

  return (
    <div className="mt-6 divide-y divide-zinc-border border border-zinc-border">
      {bookmarks.map((bookmark, index) => (
        <BookmarkItem
          key={bookmark._id}
          bookmark={bookmark}
          index={index}
        />
      ))}
    </div>
  );
}
