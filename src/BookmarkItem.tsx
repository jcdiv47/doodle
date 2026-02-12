import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { EditNotes } from "./EditNotes";
import { TagInput } from "./TagInput";
import type { Doc } from "../convex/_generated/dataModel";

export function BookmarkItem({
  bookmark,
  index,
}: {
  bookmark: Doc<"bookmarks">;
  index: number;
}) {
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemoveTag, setConfirmRemoveTag] = useState<string | null>(null);
  const remove = useMutation(api.bookmarks.remove);
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
      className={`animate-fade-in-up bg-charcoal-light p-4 transition-colors hover:bg-charcoal-lighter ${showTagInput ? "relative z-10" : ""}`}
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
                  className={`group inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-xs transition-colors ${
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

          {showTagInput && (
            <TagInput
              bookmarkId={bookmark._id}
              existingTags={tags}
              onClose={() => setShowTagInput(false)}
            />
          )}

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
}
