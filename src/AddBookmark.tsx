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
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          placeholder="paste a url..."
          className="flex-1 border border-zinc-border bg-charcoal-light px-4 py-3 font-mono text-sm text-white placeholder-zinc-text outline-none transition-colors focus:border-amber"
        />
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
