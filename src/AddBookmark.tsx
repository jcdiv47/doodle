import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { ConvexError } from "convex/values";

export function AddBookmark() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const addBookmark = useMutation(api.bookmarks.add);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = url.trim();
    if (!trimmed) return;

    let finalUrl = trimmed;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = "https://" + finalUrl;
    }

    try {
      await addBookmark({ url: finalUrl });
      setUrl("");
    } catch (err) {
      if (err instanceof ConvexError) {
        setError(err.data as string);
      } else {
        setError("Failed to add bookmark");
      }
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-0">
        <div className="relative flex-1">
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
            placeholder="paste a url..."
            className="w-full border border-zinc-border bg-charcoal-light py-3 pl-11 pr-4 font-mono text-sm text-white placeholder-zinc-text outline-none transition-colors focus:border-amber"
          />
        </div>
        <button
          type="submit"
          className="border border-l-0 border-zinc-border bg-charcoal-lighter px-6 py-3 font-mono text-sm font-medium text-amber transition-colors hover:bg-amber hover:text-charcoal"
        >
          add
        </button>
      </form>
      {error && (
        <p className="mt-2 font-mono text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
