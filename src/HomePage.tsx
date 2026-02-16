import { useState, useRef, useLayoutEffect, useCallback, type DragEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import { AddNavigation } from "./AddNavigation";
import { UserBadge } from "./UserBadge";
import { useCachedQuery } from "./lib/useCachedQuery";

function sortNavigations(items: Doc<"navigations">[]) {
  return [...items].sort((a, b) => {
    const aPosition = a.position ?? Number.MAX_SAFE_INTEGER;
    const bPosition = b.position ?? Number.MAX_SAFE_INTEGER;
    if (aPosition !== bPosition) {
      return aPosition - bPosition;
    }
    return b._creationTime - a._creationTime;
  });
}

function moveNavigation(
  items: Doc<"navigations">[],
  draggedId: Id<"navigations">,
  targetId: Id<"navigations">
) {
  const fromIndex = items.findIndex((item) => item._id === draggedId);
  const toIndex = items.findIndex((item) => item._id === targetId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function SiteSkeleton() {
  return (
    <div className="aspect-square animate-pulse border border-zinc-border bg-charcoal-light p-3">
      <div className="flex h-full flex-col items-center justify-center gap-2.5">
        <div className="h-6 w-6 rounded bg-zinc-text/10" />
        <div className="h-3.5 w-2/3 rounded bg-zinc-text/10" />
      </div>
    </div>
  );
}

function AddSiteTile() {
  return (
    <AddNavigation
      ariaLabel="Add site"
      label={(
        <span className="flex h-full flex-col items-center justify-center gap-2.5 text-center">
          <span className="font-mono text-xl leading-none text-amber">+</span>
          <span className="font-mono text-xs text-amber">Add site</span>
        </span>
      )}
      className="aspect-square w-full border border-zinc-border bg-charcoal-light p-3 transition-colors hover:border-amber/60 hover:bg-charcoal-lighter"
    />
  );
}

export function HomePage({
  onSignOut,
  onNavigate,
}: {
  onSignOut: () => Promise<void>;
  onNavigate: (path: string) => void;
}) {
  const navigations = useCachedQuery(api.navigations.list, {}, "navigations:list");
  const reorderNavigations = useMutation(api.navigations.reorder).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.navigations.list, {});
      if (!current) return;

      const byId = new Map(current.map((navigation) => [navigation._id, navigation]));
      const reordered: typeof current = [];
      let position = 0;

      for (const id of args.orderedIds) {
        const navigation = byId.get(id);
        if (!navigation) continue;
        reordered.push({ ...navigation, position });
        byId.delete(id);
        position += 1;
      }

      const remaining = sortNavigations(Array.from(byId.values()));
      for (const navigation of remaining) {
        reordered.push({ ...navigation, position });
        position += 1;
      }

      localStore.setQuery(api.navigations.list, {}, reordered);
    },
  );
  const [draggedId, setDraggedId] = useState<Id<"navigations"> | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Doc<"navigations">[] | null>(null);
  const [suppressClickId, setSuppressClickId] = useState<Id<"navigations"> | null>(null);
  const visibleNavigations = navigations;
  // Once a drag has happened, the entrance animation is done — never replay it
  const hasDragged = useRef(false);

  // FLIP animation refs
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const oldPositions = useRef<Map<string, DOMRect>>(new Map());
  const flipPending = useRef(false);

  const capturePositions = useCallback(() => {
    const positions = new Map<string, DOMRect>();
    itemRefs.current.forEach((el, id) => {
      positions.set(id, el.getBoundingClientRect());
    });
    oldPositions.current = positions;
    flipPending.current = true;
  }, []);

  // FLIP: animate items from old positions to new after reorder
  useLayoutEffect(() => {
    if (!flipPending.current || !draggedId) return;
    flipPending.current = false;

    const animating: HTMLElement[] = [];

    itemRefs.current.forEach((el, id) => {
      if (id === draggedId) return;
      const oldRect = oldPositions.current.get(id);
      if (!oldRect) return;

      const newRect = el.getBoundingClientRect();
      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      // Disable hit-testing during animation so the element can't trigger
      // a reverse dragOver while it visually passes through the cursor.
      el.style.pointerEvents = "none";
      animating.push(el);

      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.style.transition = "none";
      // Force reflow then animate to final position
      el.getBoundingClientRect();
      el.style.transform = "";
      el.style.transition = "transform 150ms ease-out";
    });

    // Restore pointer events after animation settles
    if (animating.length > 0) {
      setTimeout(() => {
        for (const el of animating) {
          el.style.pointerEvents = "";
        }
      }, 160);
    }
  });

  const displayedNavigations = previewOrder ?? visibleNavigations;

  const handleDrop = () => {
    if (!draggedId || !previewOrder || !visibleNavigations) return;
    const finalOrder = previewOrder;
    const currentDraggedId = draggedId;

    const unchanged = finalOrder.every(
      (item, i) => item._id === visibleNavigations[i]?._id,
    );
    if (unchanged) {
      setDraggedId(null);
      setPreviewOrder(null);
      return;
    }

    setSuppressClickId(currentDraggedId);
    // Fire mutation first — optimistic update applies synchronously to the
    // Convex local store, so visibleNavigations already reflects the new
    // order by the time React processes the state clears below.
    void reorderNavigations({ orderedIds: finalOrder.map((n) => n._id) });
    setDraggedId(null);
    setPreviewOrder(null);
  };

  const tileGridStyle = {
    gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
  } as const;

  return (
    <div className="min-h-screen bg-charcoal font-sans">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <a href="/" className="mt-0.5 block h-7 w-7 shrink-0">
              <img src="/logo.svg" alt="" className="h-7 w-7" />
            </a>
            <div>
              <h1 className="font-mono text-2xl font-medium tracking-tight text-white">
                doodle
              </h1>
              <p className="mt-1 font-mono text-xs text-zinc-text">
                have fun doodling
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => onNavigate("/bookmarks")}
              className="font-mono text-sm text-zinc-text transition-colors hover:text-amber"
            >
              bookmarks
            </button>
            <button
              onClick={() => onNavigate("/memos")}
              className="font-mono text-sm text-zinc-text transition-colors hover:text-amber"
            >
              memos
            </button>
            <UserBadge onSignOut={onSignOut} onNavigateToStats={() => onNavigate("/dashboard")} />
          </div>
        </header>

        {displayedNavigations === undefined ? (
          <div className="grid gap-3" style={tileGridStyle}>
            {Array.from({ length: 9 }, (_, i) => (
              <SiteSkeleton key={i} />
            ))}
            <AddSiteTile />
          </div>
        ) : (
          <div className="grid gap-3" style={tileGridStyle}>
            {displayedNavigations.map((navigation, index) => (
              <a
                key={navigation._id}
                ref={(el) => {
                  if (el) itemRefs.current.set(navigation._id, el);
                  else itemRefs.current.delete(navigation._id);
                }}
                href={navigation.url}
                target="_blank"
                rel="noopener noreferrer"
                draggable
                onDragStart={(e: DragEvent<HTMLAnchorElement>) => {
                  hasDragged.current = true;
                  setDraggedId(navigation._id);
                  setPreviewOrder(visibleNavigations ? [...visibleNavigations] : null);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e: DragEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (!draggedId || draggedId === navigation._id || !previewOrder) return;
                  const reordered = moveNavigation(previewOrder, draggedId, navigation._id);
                  if (reordered !== previewOrder) {
                    capturePositions();
                    setPreviewOrder(reordered);
                  }
                }}
                onDrop={(e: DragEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  handleDrop();
                }}
                onDragEnd={() => {
                  setDraggedId(null);
                  setPreviewOrder(null);
                  setTimeout(() => setSuppressClickId(null), 0);
                }}
                onClick={(e) => {
                  if (suppressClickId === navigation._id) {
                    e.preventDefault();
                    setSuppressClickId(null);
                  }
                }}
                className={`aspect-square border bg-charcoal-light p-3 transition-colors hover:border-amber/60 hover:bg-charcoal-lighter ${
                  draggedId && draggedId === navigation._id
                    ? "scale-[0.97] cursor-grabbing border-amber/50 opacity-40"
                    : `cursor-grab border-zinc-border${!hasDragged.current ? " animate-fade-in-up" : ""}`
                }`}
                style={!hasDragged.current ? { animationDelay: `${index * 25}ms` } : undefined}
              >
                <div className="flex h-full flex-col items-center justify-center gap-2.5 text-center">
                  {navigation.favicon ? (
                    <img
                      src={navigation.favicon}
                      alt=""
                      className="h-6 w-6 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <svg
                      className="h-6 w-6 shrink-0 text-zinc-text"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    >
                      <circle cx="8" cy="8" r="6.5" />
                      <ellipse cx="8" cy="8" rx="3" ry="6.5" />
                      <line x1="1.5" y1="8" x2="14.5" y2="8" />
                    </svg>
                  )}
                  <div className="w-full">
                    <p className="line-clamp-2 font-mono text-xs text-white">
                      {navigation.title}
                    </p>
                  </div>
                </div>
              </a>
            ))}
            <AddSiteTile />
          </div>
        )}
      </div>
    </div>
  );
}
