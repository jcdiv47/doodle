import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { EditNotes } from "./EditNotes";
import type { Doc } from "../convex/_generated/dataModel";

export function BookmarkItem({
  bookmark,
  index,
}: {
  bookmark: Doc<"bookmarks">;
  index: number;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const remove = useMutation(api.bookmarks.remove);

  const handleDelete = async () => {
    await remove({ bookmarkId: bookmark._id });
  };

  const domain = (() => {
    try {
      return new URL(bookmark.url).hostname.replace(/^www\./, "");
    } catch {
      return bookmark.url;
    }
  })();

  return (
    <div
      className="animate-fade-in-up bg-charcoal-light p-4 transition-colors hover:bg-charcoal-lighter"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-3">
        {bookmark.favicon ? (
          <img
            src={bookmark.favicon}
            alt=""
            className="mt-0.5 h-4 w-4 shrink-0"
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              el.style.display = "none";
              el.nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <svg
          className={`mt-0.5 h-4 w-4 shrink-0 text-zinc-text${bookmark.favicon ? " hidden" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <circle cx="8" cy="8" r="6.5" />
          <ellipse cx="8" cy="8" rx="3" ry="6.5" />
          <line x1="1.5" y1="8" x2="14.5" y2="8" />
        </svg>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-mono text-sm font-medium text-white hover:text-amber"
            >
              {bookmark.title}
            </a>
            <span className="shrink-0 font-mono text-xs text-zinc-text">
              {domain}
            </span>
          </div>

          {bookmark.description && (
            <p className="mt-1 line-clamp-2 text-sm text-zinc-text">
              {bookmark.description}
            </p>
          )}

          {bookmark.notes && !showNotes && (
            <p className="mt-1 border-l-2 border-amber/30 pl-2 font-mono text-xs text-zinc-text italic">
              {bookmark.notes}
            </p>
          )}

          {showNotes && (
            <EditNotes
              bookmarkId={bookmark._id}
              initialNotes={bookmark.notes || ""}
              onClose={() => setShowNotes(false)}
            />
          )}

          <div className="mt-2 flex gap-3">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="font-mono text-xs text-zinc-text transition-colors hover:text-amber"
            >
              {showNotes ? "close" : bookmark.notes ? "edit note" : "add note"}
            </button>
            <button
              onClick={handleDelete}
              className="font-mono text-xs text-zinc-text transition-colors hover:text-red-400"
            >
              delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
