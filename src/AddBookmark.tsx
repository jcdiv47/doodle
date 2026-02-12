import {
  useState,
  useEffect,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

type Preview = {
  title: string;
  description: string;
  favicon?: string;
};

export function AddBookmark() {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const bookmarks = useQuery(api.bookmarks.list);
  const previewUrl = useAction(api.fetch.previewUrl);
  const addBookmark = useMutation(api.bookmarks.add).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.bookmarks.list, {});
      const user = localStore.getQuery(api.users.me, {});
      if (current !== undefined && user?._id) {
        localStore.setQuery(api.bookmarks.list, {}, [
          {
            _id: `optimistic_${Date.now()}` as unknown as Id<"bookmarks">,
            _creationTime: Date.now(),
            url: args.url,
            title: args.title || args.url,
            description: args.description || "",
            searchText: args.url,
            favicon: args.favicon,
            notes: args.notes,
            tags: undefined,
            readCount: undefined,
            userId: user._id,
          },
          ...current,
        ]);
      }
    },
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setUrl("");
        setPreview(null);
        setIsLoading(false);
        setNotes("");
        setError(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const normalizeUrl = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return "";
    return /^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed;
  };

  const fetchPreview = async (rawUrl: string) => {
    const finalUrl = normalizeUrl(rawUrl);
    if (!finalUrl) return;
    setUrl(finalUrl);
    setIsLoading(true);
    setError(null);
    setPreview(null);
    try {
      const result = await previewUrl({ url: finalUrl });
      setPreview(result);
    } catch {
      setPreview({ title: finalUrl, description: "" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").trim();
    if (!pasted) return;
    e.preventDefault();
    const finalUrl = normalizeUrl(pasted);
    setUrl(finalUrl);
    fetchPreview(finalUrl);
  };

  const handleUrlKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fetchPreview(url);
    }
  };

  const handleAdd = () => {
    const finalUrl = normalizeUrl(url);
    if (!finalUrl || !preview) return;

    if (bookmarks?.some((b) => b.url === finalUrl)) {
      setError("this url has already been bookmarked");
      return;
    }

    const payload = {
      url: finalUrl,
      title: preview.title,
      description: preview.description,
      favicon: preview.favicon,
      notes: notes.trim() || undefined,
    };

    handleClose();
    addBookmark(payload);
  };

  const handleClose = () => {
    setIsOpen(false);
    setUrl("");
    setPreview(null);
    setIsLoading(false);
    setNotes("");
    setError(null);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="add bookmark"
        className="border border-zinc-border bg-charcoal-light px-4 py-2.5 font-mono text-sm text-amber transition-colors hover:bg-amber hover:text-charcoal"
      >
        <span className="sm:hidden">+</span>
      <span className="hidden sm:inline">+ add bookmark</span>
      </button>

      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          >
            <div
              className="mx-4 w-full max-w-lg border border-zinc-border bg-charcoal p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-sm text-amber">
                  add bookmark
                </span>
                <button
                  onClick={handleClose}
                  className="font-mono text-sm text-zinc-text transition-colors hover:text-white"
                >
                  close
                </button>
              </div>

              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-text"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) setError(null);
                  }}
                  onPaste={handlePaste}
                  onKeyDown={handleUrlKeyDown}
                  placeholder="paste a url..."
                  className="w-full border border-zinc-border bg-charcoal-light py-3 pl-11 pr-4 font-mono text-base text-white placeholder-zinc-text outline-none transition-colors focus:border-amber"
                  autoFocus
                />
              </div>

              {isLoading && (
                <div className="mt-4 flex items-center gap-2 font-mono text-sm text-zinc-text">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="opacity-25"
                    />
                    <path
                      d="M4 12a8 8 0 018-8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  fetching metadata...
                </div>
              )}

              {preview && !isLoading && (
                <>
                  <div className="mt-4 border border-zinc-border bg-charcoal-light p-4">
                    <div className="flex items-start gap-3">
                      {preview.favicon ? (
                        <img
                          src={preview.favicon}
                          alt=""
                          className="mt-0.5 h-4 w-4 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <svg
                          className="mt-0.5 h-4 w-4 shrink-0 text-zinc-text"
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
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-base font-medium text-white">
                          {preview.title}
                        </p>
                        {preview.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-zinc-text">
                            {preview.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        (e.ctrlKey || e.metaKey)
                      ) {
                        e.preventDefault();
                        handleAdd();
                      }
                    }}
                    placeholder="add a note (optional)..."
                    rows={2}
                    className="mt-3 w-full resize-none border border-zinc-border bg-charcoal-light px-3 py-2 font-mono text-sm text-white placeholder-zinc-text outline-none transition-colors focus:border-amber"
                  />

                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={handleAdd}
                      className="border border-zinc-border bg-charcoal-lighter px-6 py-2 font-mono text-sm font-medium text-amber transition-colors hover:bg-amber hover:text-charcoal"
                    >
                      add
                    </button>
                    <button
                      onClick={() => fetchPreview(url)}
                      className="px-4 py-2 font-mono text-sm text-zinc-text transition-colors hover:text-amber"
                    >
                      refresh
                    </button>
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 font-mono text-sm text-zinc-text transition-colors hover:text-white"
                    >
                      cancel
                    </button>
                  </div>
                </>
              )}

              {error && (
                <p className="mt-2 font-mono text-sm text-red-400">{error}</p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
