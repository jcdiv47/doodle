import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

export function TagInput({
  bookmarkId,
  existingTags,
  onClose,
}: {
  bookmarkId: Id<"bookmarks">;
  existingTags: string[];
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const addTag = useMutation(api.bookmarks.addTag);
  const allTags = useQuery(api.bookmarks.listTags) ?? [];
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const query = value.trim().toLowerCase();

  const suggestions = allTags.filter(
    (tag) =>
      !existingTags.includes(tag) &&
      query.length > 0 &&
      tag.includes(query) &&
      tag !== query,
  );

  const showDropdown = suggestions.length > 0;

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions.length]);

  // Scroll active item into view
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
      await addTag({ bookmarkId, tag: normalized });
      setValue("");
      setActiveIndex(-1);
      inputRef.current?.focus();
    },
    [addTag, bookmarkId],
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
      setValue("");
      onClose();
    }
  };

  return (
    <div className="relative mt-1.5">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
          // Keep open if clicking inside the dropdown
          if (listRef.current?.contains(e.relatedTarget as Node)) return;
          onClose();
        }}
        placeholder="tag name..."
        className="w-32 border border-zinc-border bg-charcoal px-2 py-1 font-mono text-sm text-white placeholder-zinc-text outline-none transition-colors focus:border-amber"
        autoFocus
      />

      {showDropdown && (
        <div
          ref={listRef}
          className="absolute left-0 top-full z-10 mt-0.5 max-h-36 w-48 overflow-y-auto border border-zinc-border bg-charcoal-light"
        >
          {suggestions.map((tag, i) => {
            const isActive = i === activeIndex;
            // Highlight the matching substring
            const matchStart = tag.indexOf(query);
            const before = tag.slice(0, matchStart);
            const match = tag.slice(matchStart, matchStart + query.length);
            const after = tag.slice(matchStart + query.length);

            return (
              <button
                key={tag}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent input blur
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
