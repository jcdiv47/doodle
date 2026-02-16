import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useCachedQuery } from "./lib/useCachedQuery";
import { MarkdownRenderer } from "./lib/markdown";
import { UserBadge } from "./UserBadge";
import type { Doc, Id } from "../convex/_generated/dataModel";

function hashTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i += 1) {
    hash = (hash * 31 + tag.charCodeAt(i)) % 360;
  }
  return {
    text: `hsl(${hash} 84% 70%)`,
    border: `hsl(${hash} 75% 58% / 0.42)`,
    bg: `hsl(${hash} 82% 52% / 0.14)`,
  };
}

function formatMemoTime(timestamp: number) {
  const now = new Date();
  const target = new Date(timestamp);
  const diffMs = now.getTime() - target.getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const targetMs = target.getTime();
  const time24h = target.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (targetMs >= startOfYesterday && targetMs < startOfToday) {
    return `Yesterday ${time24h}`;
  }

  return target.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function stripNsfwMarker(content: string) {
  return content
    .split("\n")
    .filter((line) => line.trim().toLowerCase() !== "#nsfw")
    .join("\n")
    .trim();
}

function MemoEditorModal({
  memo,
  onClose,
}: {
  memo: Doc<"memos"> | null;
  onClose: () => void;
}) {
  const [content, setContent] = useState(memo?.content ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const addMemo = useMutation(api.memos.add);
  const updateMemo = useMutation(api.memos.update);

  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSubmit = async () => {
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      setError("memo content is required");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (memo) {
        await updateMemo({ memoId: memo._id, content: normalizedContent });
      } else {
        await addMemo({ content: normalizedContent });
      }
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "failed to save memo";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-2xl border border-zinc-border bg-charcoal p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-sm text-amber">
            {memo ? "edit memo" : "new memo"}
          </span>
          <button
            onClick={onClose}
            className="font-mono text-sm text-zinc-text transition-colors hover:text-white"
          >
            close
          </button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder="write markdown memo here..."
          rows={12}
          className="w-full resize-y border border-zinc-border bg-charcoal-light px-3 py-2 font-mono text-sm leading-6 text-white placeholder-zinc-text outline-none transition-colors focus:border-amber"
          autoFocus
        />

        {error && (
          <p className="mt-2 font-mono text-sm text-red-400">{error}</p>
        )}

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => void handleSubmit()}
            disabled={isSaving}
            className="border border-zinc-border bg-charcoal-lighter px-5 py-2 font-mono text-sm text-amber transition-colors hover:bg-amber hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "saving..." : memo ? "save" : "add"}
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

function MemoCard({
  memo,
  index,
  onTagClick,
  onEdit,
  selectionMode,
  isSelected,
  onToggleSelection,
}: {
  memo: Doc<"memos">;
  index: number;
  onTagClick: (tag: string) => void;
  onEdit: (memo: Doc<"memos">) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (memoId: Id<"memos">) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showSensitiveContent, setShowSensitiveContent] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const togglePin = useMutation(api.memos.togglePin);
  const removeMemo = useMutation(api.memos.remove);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
      setConfirmDelete(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const content = stripNsfwMarker(memo.content);
  const shouldCollapse = content.length > 420 || content.split("\n").length > 11;
  const isBlurred = memo.hasNsfw && !showSensitiveContent;

  return (
    <article
      className={`animate-fade-in-up border border-zinc-border bg-charcoal-light p-4 ${
        selectionMode && isSelected ? "border-l-2 border-l-amber bg-amber/5" : ""
      } ${selectionMode ? "cursor-pointer" : ""}`}
      style={{ animationDelay: `${index * 35}ms` }}
      onClick={selectionMode ? () => onToggleSelection?.(memo._id) : undefined}
      role={selectionMode ? "button" : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          {selectionMode && (
            <input
              type="checkbox"
              checked={isSelected ?? false}
              onChange={() => onToggleSelection?.(memo._id)}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-amber"
            />
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-text">
              {formatMemoTime(memo.updatedAt)}
            </span>
            {memo.isPinned && (
              <span className="border border-amber/30 bg-amber/10 px-1.5 py-0.5 font-mono text-xs text-amber">
                pinned
              </span>
            )}
            {memo.hasNsfw && (
              <span className="border border-red-400/30 bg-red-400/10 px-1.5 py-0.5 font-mono text-xs text-red-300">
                nsfw
              </span>
            )}
          </div>
        </div>

        {!selectionMode && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => {
                setMenuOpen((open) => !open);
                setConfirmDelete(false);
              }}
              className="rounded px-2 py-0.5 font-mono text-lg leading-none text-zinc-text transition-colors hover:text-white"
              aria-label="Memo options"
            >
              <span aria-hidden="true">⋮</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-10 mt-1.5 w-32 border border-zinc-border bg-charcoal shadow-lg">
                <button
                  onClick={() => {
                    void togglePin({ memoId: memo._id });
                    setMenuOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left font-mono text-xs text-zinc-text transition-colors hover:bg-charcoal-light hover:text-white"
                >
                  {memo.isPinned ? "Unpin" : "Pin"}
                </button>
                <button
                  onClick={() => {
                    onEdit(memo);
                    setMenuOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left font-mono text-xs text-zinc-text transition-colors hover:bg-charcoal-light hover:text-white"
                >
                  Edit
                </button>
                {confirmDelete ? (
                  <button
                    onClick={() => {
                      void removeMemo({ memoId: memo._id });
                      setMenuOpen(false);
                      setConfirmDelete(false);
                    }}
                    className="block w-full px-3 py-2 text-left font-mono text-xs text-red-400 transition-colors hover:bg-red-400/10 hover:text-red-300"
                  >
                    Confirm delete
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="block w-full px-3 py-2 text-left font-mono text-xs text-zinc-text transition-colors hover:bg-charcoal-light hover:text-red-400"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div
          className={`relative overflow-hidden border border-zinc-border bg-charcoal p-3 ${
            !expanded && shouldCollapse ? "max-h-64" : ""
          }`}
        >
          <div
            className={isBlurred ? "select-none blur-sm pointer-events-none" : ""}
            aria-hidden={isBlurred}
          >
            <MarkdownRenderer
              content={content || "*(empty memo)*"}
              onTagClick={selectionMode ? () => {} : onTagClick}
            />
          </div>

          {isBlurred && !selectionMode && (
            <button
              onClick={() => setShowSensitiveContent(true)}
              className="absolute inset-0 flex items-center justify-center bg-charcoal/40 font-mono text-sm text-amber backdrop-blur-[1px] transition-colors hover:bg-charcoal/20"
            >
              Click to show content
            </button>
          )}

          {!expanded && shouldCollapse && !isBlurred && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-charcoal to-transparent" />
          )}
        </div>

        {!selectionMode &&
        ((shouldCollapse && !isBlurred) || (memo.hasNsfw && showSensitiveContent)) ? (
          <div className="mt-2 flex items-center justify-end gap-3">
            {shouldCollapse && !isBlurred && (
              <button
                onClick={() => setExpanded((value) => !value)}
                className="mr-auto font-mono text-xs text-zinc-text transition-colors hover:text-amber"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}

            {memo.hasNsfw && showSensitiveContent && (
              <button
                onClick={() => setShowSensitiveContent(false)}
                className="font-mono text-xs text-zinc-text transition-colors hover:text-white"
              >
                Hide sensitive content
              </button>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function MemoBulkActionBar({
  selectedIds,
  onClearSelection,
  onExitSelectionMode,
}: {
  selectedIds: Set<Id<"memos">>;
  onClearSelection: () => void;
  onExitSelectionMode: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const removeMemo = useMutation(api.memos.remove);

  const count = selectedIds.size;
  if (count === 0) return null;

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    for (const memoId of selectedIds) {
      await removeMemo({ memoId });
    }
    onExitSelectionMode();
  };

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-border bg-charcoal-light">
      <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
        <span className="font-mono text-sm text-amber">{count} selected</span>

        {confirmDelete ? (
          <span className="inline-flex gap-2">
            <span className="font-mono text-sm text-red-400">
              delete {count} memo{count !== 1 ? "s" : ""}?
            </span>
            <button
              onClick={() => setConfirmDelete(false)}
              className="font-mono text-sm text-zinc-text transition-colors hover:text-white"
            >
              cancel
            </button>
            <button
              onClick={() => void handleDelete()}
              className="font-mono text-sm text-red-400 transition-colors hover:text-red-300"
            >
              confirm
            </button>
          </span>
        ) : (
          <button
            onClick={() => void handleDelete()}
            className="font-mono text-sm text-zinc-text transition-colors hover:text-red-400"
          >
            delete
          </button>
        )}

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

export function MemosPage({
  onSignOut,
  onNavigate,
}: {
  onSignOut: () => Promise<void>;
  onNavigate: (path: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [todayOnly, setTodayOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState<Doc<"memos"> | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<Id<"memos">>>(new Set());

  const memos = useCachedQuery(api.memos.list, {}, "memos:list");
  const allTags = useCachedQuery(api.memos.listTags, {}, "memos:listTags") ?? [];

  const filteredMemos = useMemo(() => {
    if (!memos) return memos;

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

    const filtered = memos.filter((memo) => {
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const haystack = `${memo.content}\n${memo.searchText}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      if (todayOnly) {
        if (memo._creationTime < startOfToday || memo._creationTime >= endOfToday) {
          return false;
        }
      }
      if (selectedTags.size > 0) {
        for (const tag of selectedTags) {
          if (!memo.tags.includes(tag)) {
            return false;
          }
        }
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      const compareByTime = a._creationTime - b._creationTime;
      return sortOrder === "asc" ? compareByTime : -compareByTime;
    });
  }, [memos, searchQuery, selectedTags, sortOrder, todayOnly]);

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((previous) => {
      const normalized = tag.toLowerCase();
      const next = new Set(previous);
      if (next.has(normalized)) {
        next.delete(normalized);
      } else {
        next.add(normalized);
      }
      return next;
    });
  };

  const filterByTagFromMemo = (tag: string) => {
    setSelectedTags(new Set([tag.toLowerCase()]));
  };

  const toggleMemoSelection = (memoId: Id<"memos">) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(memoId)) {
        next.delete(memoId);
      } else {
        next.add(memoId);
      }
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const allSelected =
    (filteredMemos?.length ?? 0) > 0 &&
    filteredMemos?.every((memo) => selectedIds.has(memo._id));

  const handleSelectAll = () => {
    if (!filteredMemos || filteredMemos.length === 0) return;
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (allSelected) {
        for (const memo of filteredMemos) {
          next.delete(memo._id);
        }
      } else {
        for (const memo of filteredMemos) {
          next.add(memo._id);
        }
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-charcoal font-sans">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <a href="/" className="mt-0.5 block h-7 w-7 shrink-0">
              <img src="/logo.svg" alt="" className="h-7 w-7" />
            </a>
            <div>
              <h1 className="font-mono text-2xl font-medium tracking-tight text-white">
                memos
              </h1>
              <p className="mt-1 font-mono text-xs text-zinc-text">
                quick thought dump
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate("/bookmarks")}
              className="font-mono text-sm text-zinc-text transition-colors hover:text-amber"
            >
              bookmarks
            </button>
            {!selectionMode && (
              <button
                onClick={() => {
                  setEditingMemo(null);
                  setIsEditorOpen(true);
                }}
                className="border border-zinc-border bg-charcoal-light px-4 py-2.5 font-mono text-sm text-amber transition-colors hover:bg-amber hover:text-charcoal"
              >
                +
              </button>
            )}
            <UserBadge
              onSignOut={onSignOut}
              onNavigateToStats={() => onNavigate("/dashboard")}
            />
          </div>
        </header>

        <div className="relative mt-8">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-text"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <circle cx="6.5" cy="6.5" r="4.5" />
            <line x1="10" y1="10" x2="14" y2="14" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="search memos..."
            className="w-full border border-zinc-border bg-charcoal-light py-3 pl-11 pr-10 font-mono text-base text-white placeholder-zinc-text outline-none transition-colors focus:border-amber"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-zinc-text transition-colors hover:text-white"
              aria-label="Clear search"
            >
              clear
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="mb-4 mt-4 flex flex-wrap gap-1.5">
            {allTags.map((tag) => {
              const isSelected = selectedTags.has(tag);
              const color = hashTagColor(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTagFilter(tag)}
                  className={`border px-2.5 py-1 font-mono text-sm transition-all ${
                    isSelected
                      ? ""
                      : "bg-charcoal-lighter hover:bg-charcoal"
                  }`}
                  style={{
                    color: color.text,
                    borderColor: isSelected ? color.border : "var(--color-zinc-border)",
                    backgroundColor: isSelected ? color.bg : undefined,
                  }}
                >
                  #{tag}
                </button>
              );
            })}
            {selectedTags.size > 0 && (
              <button
                onClick={() => setSelectedTags(new Set())}
                className="border border-transparent px-2 py-1 font-mono text-sm text-zinc-text transition-colors hover:text-red-400"
              >
                clear
              </button>
            )}
          </div>
        )}

        <div
          className={`mb-3 flex items-center gap-1.5 font-mono text-sm ${
            allTags.length > 0 ? "" : "mt-4"
          }`}
        >
          <span className="mr-1 text-zinc-text">sort:</span>
          <button
            onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
            className="px-1 text-zinc-text transition-colors hover:text-white/80"
            aria-label={sortOrder === "asc" ? "Ascending" : "Descending"}
          >
            {sortOrder === "asc" ? "date ↑" : "date ↓"}
          </button>
          <button
            onClick={() => setTodayOnly((value) => !value)}
            className={`px-1 transition-colors ${
              todayOnly ? "text-amber" : "text-zinc-text hover:text-white/80"
            }`}
          >
            today
          </button>
          <span className="ml-auto inline-flex items-center gap-2">
            {selectionMode && (filteredMemos?.length ?? 0) > 0 && (
              <button
                onClick={handleSelectAll}
                className="text-zinc-text transition-colors hover:text-amber"
              >
                {allSelected ? "deselect all" : "select all"}
              </button>
            )}
            {selectionMode && (
              <span className="text-zinc-border">|</span>
            )}
            <button
              onClick={() => {
                if (selectionMode) {
                  exitSelectionMode();
                } else {
                  setSelectionMode(true);
                }
              }}
              className={`transition-colors ${
                selectionMode
                  ? "text-amber hover:text-amber/80"
                  : "text-zinc-text hover:text-amber"
              }`}
            >
              {selectionMode ? "cancel" : "select"}
            </button>
          </span>
        </div>

        {filteredMemos === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="animate-pulse border border-zinc-border bg-charcoal-light p-4"
              >
                <div className="mb-3 h-3 w-28 rounded bg-zinc-text/10" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-zinc-text/10" />
                  <div className="h-3 w-5/6 rounded bg-zinc-text/5" />
                  <div className="h-3 w-2/3 rounded bg-zinc-text/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredMemos.length === 0 ? (
          <div className="border border-dashed border-zinc-border p-8 text-center font-mono text-sm text-zinc-text">
            {searchQuery.trim()
              ? "no memos match your search"
              : todayOnly
              ? "no memos created today"
              : selectedTags.size > 0
                ? "no memos match selected tags"
                : "no memos yet — add one above"}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredMemos.map((memo, index) => (
              <MemoCard
                key={memo._id}
                memo={memo}
                index={index}
                onTagClick={filterByTagFromMemo}
                onEdit={(memoToEdit) => {
                  setEditingMemo(memoToEdit);
                  setIsEditorOpen(true);
                }}
                selectionMode={selectionMode}
                isSelected={selectedIds.has(memo._id)}
                onToggleSelection={toggleMemoSelection}
              />
            ))}
          </div>
        )}
      </div>

      {selectionMode && (
        <MemoBulkActionBar
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds(new Set())}
          onExitSelectionMode={exitSelectionMode}
        />
      )}

      {isEditorOpen && (
        <MemoEditorModal
          memo={editingMemo}
          onClose={() => {
            setEditingMemo(null);
            setIsEditorOpen(false);
          }}
        />
      )}
    </div>
  );
}
