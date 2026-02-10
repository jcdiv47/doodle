import { useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
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
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagValue, setTagValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemoveTag, setConfirmRemoveTag] = useState<string | null>(null);
  const remove = useMutation(api.bookmarks.remove);
  const addTag = useMutation(api.bookmarks.addTag);
  const removeTag = useMutation(api.bookmarks.removeTag);

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

  const handleAddTag = async () => {
    const tag = tagValue.trim().toLowerCase();
    if (!tag) return;
    await addTag({ bookmarkId: bookmark._id, tag });
    setTagValue("");
    setShowTagInput(false);
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === "Escape") {
      setTagValue("");
      setShowTagInput(false);
    }
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

          {tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={`group inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[10px] transition-colors ${
                    confirmRemoveTag === tag
                      ? "border-red-400/40 bg-red-400/10 text-red-400"
                      : "border-amber/20 bg-amber/5 text-amber/70"
                  }`}
                >
                  {confirmRemoveTag === tag ? "remove?" : tag}
                  {confirmRemoveTag === tag ? (
                    <>
                      <button
                        onClick={() => setConfirmRemoveTag(null)}
                        className="text-zinc-text transition-colors hover:text-white"
                        aria-label="Cancel"
                      >
                        &times;
                      </button>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="text-red-400 transition-colors hover:text-red-300"
                        aria-label="Confirm remove"
                      >
                        &larr;
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-amber/30 transition-colors hover:text-red-400"
                      aria-label={`Remove tag ${tag}`}
                    >
                      &times;
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {bookmark.notes && !showNotes && (
            <div className="mt-1 flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate border-l-2 border-amber/30 pl-2 font-mono text-xs text-zinc-text italic">
                {bookmark.notes}
              </p>
              <button
                onClick={() => setShowNoteModal(true)}
                className="shrink-0 font-mono text-xs text-zinc-text transition-colors hover:text-amber"
              >
                view
              </button>
            </div>
          )}

          {showNotes && (
            <EditNotes
              bookmarkId={bookmark._id}
              initialNotes={bookmark.notes || ""}
              onClose={() => setShowNotes(false)}
            />
          )}

          {showTagInput && (
            <div className="mt-1.5">
              <input
                type="text"
                value={tagValue}
                onChange={(e) => setTagValue(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => {
                  if (!tagValue.trim()) {
                    setShowTagInput(false);
                  }
                }}
                placeholder="tag name..."
                className="w-32 border border-zinc-border bg-charcoal px-2 py-1 font-mono text-xs text-white placeholder-zinc-text outline-none transition-colors focus:border-amber"
                autoFocus
              />
            </div>
          )}

          <div className="mt-2 flex gap-3">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="font-mono text-xs text-zinc-text transition-colors hover:text-amber"
            >
              {showNotes ? "close" : bookmark.notes ? "edit note" : "add note"}
            </button>
            <button
              onClick={() => setShowTagInput(!showTagInput)}
              className="font-mono text-xs text-zinc-text transition-colors hover:text-amber"
            >
              {showTagInput ? "close" : "add tag"}
            </button>
            {confirmDelete ? (
              <span className="inline-flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="font-mono text-xs text-zinc-text transition-colors hover:text-white"
                >
                  cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="font-mono text-xs text-red-400 transition-colors hover:text-red-300"
                >
                  confirm
                </button>
              </span>
            ) : (
              <button
                onClick={handleDelete}
                className="font-mono text-xs text-zinc-text transition-colors hover:text-red-400"
              >
                delete
              </button>
            )}
          </div>
        </div>
      </div>
      {showNoteModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowNoteModal(false)}
        >
          <div
            className="mx-4 flex max-h-[80vh] w-full max-w-lg flex-col border border-zinc-border bg-charcoal p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <span className="font-mono text-xs text-amber">note</span>
              <button
                onClick={() => setShowNoteModal(false)}
                className="font-mono text-xs text-zinc-text transition-colors hover:text-white"
              >
                close
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto">
              <p className="whitespace-pre-wrap break-words font-mono text-xs text-zinc-text">
                {bookmark.notes}
              </p>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
