import { useState, useEffect, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

export function EditNotes({
  bookmarkId,
  initialNotes,
  onClose,
}: {
  bookmarkId: Id<"bookmarks">;
  initialNotes: string;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const updateNotes = useMutation(api.bookmarks.updateNotes);

  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSave = () => {
    updateNotes({ bookmarkId, notes });
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 flex w-full max-w-lg flex-col border border-zinc-border bg-charcoal p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3">
          <span className="font-mono text-sm text-amber">note</span>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSave();
            }
          }}
          placeholder="add a note..."
          rows={5}
          className="w-full resize-none border border-zinc-border bg-charcoal-light px-3 py-2 font-mono text-sm text-white placeholder-zinc-text outline-none transition-colors focus:border-amber"
          autoFocus
        />
        <div className="mt-3 flex gap-3">
          <button
            onClick={handleSave}
            className="border border-zinc-border bg-charcoal-lighter px-6 py-2 font-mono text-sm font-medium text-amber transition-colors hover:bg-amber hover:text-charcoal"
          >
            save
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 font-mono text-sm text-zinc-text transition-colors hover:text-white"
          >
            cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
