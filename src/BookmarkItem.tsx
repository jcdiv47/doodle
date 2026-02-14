import { useState, memo } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { EditNotes } from "./EditNotes";
import { TagInput } from "./TagInput";
import type { Doc, Id } from "../convex/_generated/dataModel";

export const BookmarkItem = memo(function BookmarkItem({
  bookmark,
  index,
  isNew,
  selectionMode,
  isSelected,
  onToggleSelection,
}: {
  bookmark: Doc<"bookmarks">;
  index: number;
  isNew?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: Id<"bookmarks">) => void;
}) {
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemoveTag, setConfirmRemoveTag] = useState<string | null>(null);
  const remove = useMutation(api.bookmarks.remove).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.bookmarks.list, {});
      if (current !== undefined) {
        localStore.setQuery(
          api.bookmarks.list,
          {},
          current.filter((b) => b._id !== args.bookmarkId),
        );
      }
    },
  );
  const removeTag = useMutation(api.bookmarks.removeTag);
  const trackRead = useMutation(api.bookmarks.trackRead);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await remove({ bookmarkId: bookmark._id });
  };

  const handleRemoveTag = async (tag: string) => {
    if (confirmRemoveTag !== tag) {
      setConfirmRemoveTag(tag);
      return;
    }
    await removeTag({ bookmarkId: bookmark._id, tag });
    setConfirmRemoveTag(null);
  };

  const domain = (() => {
    try {
      return new URL(bookmark.url).hostname.replace(/^www\./, "");
    } catch {
      return bookmark.url;
    }
  })();

  const tags = bookmark.tags ?? [];

  return (
    <div
      className={`${isNew ? "animate-fade-in-up" : ""} bg-charcoal-light p-4 transition-colors hover:bg-charcoal-lighter ${showTagInput ? "relative z-10" : ""} ${selectionMode && isSelected ? "border-l-2 border-l-amber bg-amber/5" : ""}`}
      style={isNew ? { animationDelay: `${index * 50}ms` } : undefined}
      onClick={selectionMode ? () => onToggleSelection?.(bookmark._id) : undefined}
      role={selectionMode ? "button" : undefined}
    >
      <div className="flex items-start gap-3">
        {selectionMode && (
          <input
            type="checkbox"
            checked={isSelected ?? false}
            onChange={() => onToggleSelection?.(bookmark._id)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-amber"
          />
        )}
        {bookmark.favicon ? (
          <img
            src={bookmark.favicon}
            alt=""
            className="mt-1 h-4 w-4 shrink-0"
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              el.style.display = "none";
              el.nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <svg
          className={`mt-1 h-4 w-4 shrink-0 text-zinc-text${bookmark.favicon ? " hidden" : ""}`}
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
              onClick={() => trackRead({ bookmarkId: bookmark._id })}
              className="truncate font-mono text-base font-medium text-white hover:text-amber"
            >
              {bookmark.title}
            </a>
            <span className="shrink-0 font-mono text-sm text-zinc-text">
              {domain}
              {(bookmark.readCount ?? 0) > 0 && (
                <> · {bookmark.readCount} {bookmark.readCount === 1 ? "read" : "reads"}</>
              )}
            </span>
          </div>

          {bookmark.description && (
            <p className="mt-1 line-clamp-2 text-sm text-zinc-text">
              {bookmark.description}
            </p>
          )}

          {tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={`group inline-flex items-center border px-1.5 py-0.5 font-mono text-xs transition-colors ${
                    confirmRemoveTag === tag
                      ? "border-red-400/40 bg-red-400/10 text-red-400"
                      : "border-amber/20 bg-amber/5 text-amber/70"
                  }`}
                >
                  {confirmRemoveTag === tag ? "remove?" : tag}
                  {confirmRemoveTag === tag ? (
                    <span className="ml-1 inline-flex gap-1">
                      <button
                        onClick={() => setConfirmRemoveTag(null)}
                        className="font-mono text-xs text-zinc-text transition-colors hover:text-white"
                      >
                        cancel
                      </button>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="font-mono text-xs text-red-400 transition-colors hover:text-red-300"
                      >
                        confirm
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="max-w-0 overflow-hidden font-mono text-xs text-zinc-text transition-all group-hover:ml-1 group-hover:max-w-4 group-hover:opacity-100 hover:text-red-400 opacity-0"
                      aria-label={`Remove tag ${tag}`}
                    >
                      &times;
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {bookmark.notes && (
            <button
              onClick={() => setShowNoteModal(true)}
              className="mt-1 flex w-full items-center gap-2 text-left"
            >
              <p className="min-w-0 flex-1 truncate border-l-2 border-amber/30 pl-2 font-mono text-sm text-zinc-text italic">
                {bookmark.notes}
              </p>
            </button>
          )}

          {!selectionMode && showTagInput && (
            <TagInput
              bookmarkId={bookmark._id}
              existingTags={tags}
              onClose={() => setShowTagInput(false)}
            />
          )}

          {!selectionMode && (
            <div className="mt-2 flex gap-3">
              <button
                onClick={() => setShowNoteModal(true)}
                className="font-mono text-sm text-zinc-text transition-colors hover:text-amber"
              >
                {bookmark.notes ? "edit note" : "add note"}
              </button>
              <button
                onClick={() => setShowTagInput(!showTagInput)}
                className="font-mono text-sm text-zinc-text transition-colors hover:text-amber"
              >
                {showTagInput ? "close" : "add tag"}
              </button>
              {confirmDelete ? (
                <span className="inline-flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="font-mono text-sm text-zinc-text transition-colors hover:text-white"
                  >
                    cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="font-mono text-sm text-red-400 transition-colors hover:text-red-300"
                  >
                    confirm
                  </button>
                </span>
              ) : (
                <button
                  onClick={handleDelete}
                  className="font-mono text-sm text-zinc-text transition-colors hover:text-red-400"
                >
                  delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {showNoteModal && (
        <EditNotes
          bookmarkId={bookmark._id}
          initialNotes={bookmark.notes || ""}
          onClose={() => setShowNoteModal(false)}
        />
      )}
    </div>
  );
});
