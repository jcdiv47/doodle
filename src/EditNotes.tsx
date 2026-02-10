import { useState, type FormEvent, type KeyboardEvent } from "react";
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateNotes({ bookmarkId, notes });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
        placeholder="add a note..."
        rows={2}
        className="w-full resize-none border border-zinc-border bg-charcoal px-3 py-2 font-mono text-xs text-white placeholder-zinc-text outline-none transition-colors focus:border-amber"
        autoFocus
      />
      <div className="mt-1 flex gap-2">
        <button
          type="submit"
          className="font-mono text-xs text-amber transition-colors hover:text-amber-hover"
        >
          save
        </button>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-xs text-zinc-text transition-colors hover:text-white"
        >
          cancel
        </button>
      </div>
    </form>
  );
}
