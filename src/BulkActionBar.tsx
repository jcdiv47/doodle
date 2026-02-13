import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

function BulkTagInput({
  selectedIds,
  onDone,
}: {
  selectedIds: Set<Id<"bookmarks">>;
  onDone: () => void;
}) {
  const [value, setValue] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const bulkAddTag = useMutation(api.bookmarks.bulkAddTag);
  const allTags = useQuery(api.bookmarks.listTags) ?? [];
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const query = value.trim().toLowerCase();

  const suggestions = allTags.filter(
    (tag) => query.length > 0 && tag.includes(query) && tag !== query,
  );

  const showDropdown = suggestions.length > 0;

  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions.length]);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const submitTag = useCallback(
    async (tag: string) => {
      const normalized = tag.trim().toLowerCase();
      if (!normalized) return;
      await bulkAddTag({
        bookmarkIds: Array.from(selectedIds),
        tag: normalized,
      });
      setValue("");
      setActiveIndex(-1);
      onDone();
    },
    [bulkAddTag, selectedIds, onDone],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && showDropdown) {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp" && showDropdown) {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Tab" && showDropdown && suggestions.length > 0) {
      e.preventDefault();
      const pick = activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0];
      submitTag(pick);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && showDropdown) {
        submitTag(suggestions[activeIndex]);
      } else {
        submitTag(value);
      }
    } else if (e.key === "Escape") {
      onDone();
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="tag name..."
        className="w-32 border border-zinc-border bg-charcoal px-2 py-1 font-mono text-sm text-white placeholder-zinc-text outline-none transition-colors focus:border-amber"
        autoFocus
      />

      {showDropdown && (
        <div
          ref={listRef}
          className="absolute bottom-full left-0 z-10 mb-0.5 max-h-36 w-48 overflow-y-auto border border-zinc-border bg-charcoal-light"
        >
          {suggestions.map((tag, i) => {
            const isActive = i === activeIndex;
            const matchStart = tag.indexOf(query);
            const before = tag.slice(0, matchStart);
            const match = tag.slice(matchStart, matchStart + query.length);
            const after = tag.slice(matchStart + query.length);

            return (
              <button
                key={tag}
                onMouseDown={(e) => {
                  e.preventDefault();
                  submitTag(tag);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center px-2 py-1.5 text-left font-mono text-sm transition-colors ${
                  isActive
                    ? "bg-amber/10 text-amber"
                    : "text-zinc-text hover:bg-amber/5 hover:text-amber/80"
                }`}
              >
                <span>
                  {before}
                  <span className={isActive ? "text-amber" : "text-white"}>
                    {match}
                  </span>
                  {after}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function BulkActionBar({
  selectedIds,
  onClearSelection,
  onExitSelectionMode,
}: {
  selectedIds: Set<Id<"bookmarks">>;
  onClearSelection: () => void;
  onExitSelectionMode: () => void;
}) {
  const [showTagInput, setShowTagInput] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const bulkRemove = useMutation(api.bookmarks.bulkRemove);

  const count = selectedIds.size;
  if (count === 0) return null;

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await bulkRemove({ bookmarkIds: Array.from(selectedIds) });
    onExitSelectionMode();
  };

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-border bg-charcoal-light">
      <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
        <span className="font-mono text-sm text-amber">
          {count} selected
        </span>

        <div className="flex items-center gap-3">
          {showTagInput ? (
            <BulkTagInput
              selectedIds={selectedIds}
              onDone={() => setShowTagInput(false)}
            />
          ) : (
            <button
              onClick={() => {
                setShowTagInput(true);
                setConfirmDelete(false);
              }}
              className="font-mono text-sm text-zinc-text transition-colors hover:text-amber"
            >
              add tag
            </button>
          )}

          {confirmDelete ? (
            <span className="inline-flex gap-2">
              <span className="font-mono text-sm text-red-400">
                delete {count} bookmark{count !== 1 ? "s" : ""}?
              </span>
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
              onClick={() => {
                handleDelete();
                setShowTagInput(false);
              }}
              className="font-mono text-sm text-zinc-text transition-colors hover:text-red-400"
            >
              delete
            </button>
          )}
        </div>

        <button
          onClick={onClearSelection}
          className="ml-auto font-mono text-sm text-zinc-text transition-colors hover:text-white"
        >
          clear
        </button>
      </div>
    </div>,
    document.body,
  );
}
