import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ApiKeySettings({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const keys = useQuery(api.apiKeys.list);
  const generateKey = useMutation(api.apiKeys.generate);
  const revokeKey = useMutation(api.apiKeys.revoke);

  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<Id<"apiKeys"> | null>(null);

  const resetFormState = useCallback(() => {
    setName("");
    setNewKey(null);
    setCopied(false);
    setError(null);
    setConfirmRevoke(null);
  }, []);

  const handleClose = useCallback(() => {
    resetFormState();
    onClose();
  }, [onClose, resetFormState]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, handleClose]);

  const handleGenerate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    try {
      const key = await generateKey({ name: trimmed });
      setNewKey(key);
      setName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate key");
    }
  };

  const handleCopy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (keyId: Id<"apiKeys">) => {
    try {
      await revokeKey({ keyId });
      setConfirmRevoke(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke key");
    }
  };

  if (!isOpen) return null;

  const canGenerate = (keys?.length ?? 0) < 3;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="mx-4 w-full max-w-lg border border-zinc-border bg-charcoal p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-sm text-amber">api keys</span>
          <button
            onClick={handleClose}
            className="font-mono text-sm text-zinc-text transition-colors hover:text-white"
          >
            close
          </button>
        </div>

        {/* New key reveal */}
        {newKey && (
          <div className="mb-4 border border-amber/30 bg-amber/5 p-4">
            <p className="mb-2 font-mono text-xs text-amber">
              copy this key now — it won't be shown again
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-white">
                {newKey}
              </code>
              <button
                onClick={handleCopy}
                className="shrink-0 border border-zinc-border px-3 py-1 font-mono text-xs text-zinc-text transition-colors hover:text-white"
              >
                {copied ? "copied" : "copy"}
              </button>
            </div>
            <p className="mt-3 font-mono text-xs text-zinc-text">
              usage: <code className="text-white">Authorization: Bearer {"<your-key>"}</code>
            </p>
            <button
              onClick={() => setNewKey(null)}
              className="mt-2 font-mono text-xs text-zinc-text transition-colors hover:text-white"
            >
              dismiss
            </button>
          </div>
        )}

        {/* Existing keys */}
        {keys && keys.length > 0 && (
          <div className="mb-4 space-y-2">
            {keys.map((k) => (
              <div
                key={k._id}
                className="flex items-center justify-between border border-zinc-border bg-charcoal-light px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-white">{k.name}</span>
                    <code className="font-mono text-xs text-zinc-text">
                      {k.prefix}...
                    </code>
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-zinc-text">
                    created {formatDate(k.createdAt)}
                    {k.lastUsedAt && <> · last used {formatDate(k.lastUsedAt)}</>}
                  </div>
                </div>
                {confirmRevoke === k._id ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => handleRevoke(k._id)}
                      className="font-mono text-xs text-red-400 transition-colors hover:text-red-300"
                    >
                      confirm
                    </button>
                    <button
                      onClick={() => setConfirmRevoke(null)}
                      className="font-mono text-xs text-zinc-text transition-colors hover:text-white"
                    >
                      cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRevoke(k._id)}
                    className="shrink-0 font-mono text-xs text-zinc-text transition-colors hover:text-red-400"
                  >
                    revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {keys && keys.length === 0 && !newKey && (
          <p className="mb-4 font-mono text-xs text-zinc-text">
            no api keys yet. generate one to use the bookmark api.
          </p>
        )}

        {/* Generate form */}
        {canGenerate && (
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="key name (e.g. cli, raycast)"
              maxLength={32}
              className="min-w-0 flex-1 border border-zinc-border bg-charcoal-light px-3 py-2 font-mono text-sm text-white placeholder-zinc-text outline-none transition-colors focus:border-amber"
            />
            <button
              onClick={handleGenerate}
              disabled={!name.trim()}
              className="shrink-0 border border-zinc-border bg-charcoal-light px-4 py-2 font-mono text-sm text-amber transition-colors hover:bg-amber hover:text-charcoal disabled:opacity-40 disabled:hover:bg-charcoal-light disabled:hover:text-amber"
            >
              generate
            </button>
          </div>
        )}

        {error && (
          <p className="mt-2 font-mono text-sm text-red-400">{error}</p>
        )}
      </div>
    </div>,
    document.body,
  );
}
