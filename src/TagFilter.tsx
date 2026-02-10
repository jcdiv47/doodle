import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function TagFilter({
  selectedTags,
  onToggleTag,
}: {
  selectedTags: Set<string>;
  onToggleTag: (tag: string) => void;
}) {
  const allTags = useQuery(api.bookmarks.listTags);

  if (!allTags || allTags.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {allTags.map((tag) => {
        const isSelected = selectedTags.has(tag);
        return (
          <button
            key={tag}
            onClick={() => onToggleTag(tag)}
            className={`border px-2.5 py-1 font-mono text-sm transition-all ${
              isSelected
                ? "border-amber/60 bg-amber/10 text-amber"
                : "border-zinc-border bg-charcoal-lighter text-zinc-text hover:border-zinc-text/40 hover:text-white/70"
            }`}
          >
            {tag}
          </button>
        );
      })}
      {selectedTags.size > 0 && (
        <button
          onClick={() => {
            for (const tag of selectedTags) {
              onToggleTag(tag);
            }
          }}
          className="border border-transparent px-2 py-1 font-mono text-sm text-zinc-text transition-colors hover:text-red-400"
        >
          clear
        </button>
      )}
    </div>
  );
}
