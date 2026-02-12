import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { authClient } from "./lib/auth-client";
import {
  getPasskeySupportDetails,
  getPasskeyUnsupportedMessage,
} from "./lib/passkey-support";

function formatDate(value: Date | string | number | undefined) {
  if (value === undefined) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PasskeySettings({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const passkeyState = authClient.useListPasskeys();
  const passkeys = passkeyState.data ?? [];
  const passkeyRefetchRef = useRef(passkeyState.refetch);
  const [name, setName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  passkeyRefetchRef.current = passkeyState.refetch;

  const handleClose = useCallback(() => {
    setName("");
    setError(null);
    setConfirmDelete(null);
    setIsAdding(false);
    setIsDeleting(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    void passkeyRefetchRef.current();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, handleClose]);

  const handleAddPasskey = async () => {
    const unsupportedMessage = getPasskeyUnsupportedMessage();
    if (unsupportedMessage) {
      console.warn("[passkey] unsupported", getPasskeySupportDetails());
      setError(unsupportedMessage);
      return;
    }

    setError(null);
    setIsAdding(true);
    try {
      const trimmedName = name.trim();
      const response = await authClient.passkey.addPasskey({
        name: trimmedName.length > 0 ? trimmedName : undefined,
      });
      if (response.error) {
        setError(response.error.message ?? "failed to add passkey");
        return;
      }
      setName("");
      await passkeyState.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to add passkey");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    setError(null);
    setIsDeleting(id);
    try {
      const response = await authClient.passkey.deletePasskey({ id });
      if (response.error) {
        setError(response.error.message ?? "failed to remove passkey");
        return;
      }
      setConfirmDelete(null);
      await passkeyState.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to remove passkey");
    } finally {
      setIsDeleting(null);
    }
  };

  if (!isOpen) return null;

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
          <span className="font-mono text-sm text-amber">passkeys</span>
          <button
            onClick={handleClose}
            className="font-mono text-sm text-zinc-text transition-colors hover:text-white"
          >
            close
          </button>
        </div>

        {passkeyState.isPending && passkeys.length === 0 && (
          <p className="mb-4 font-mono text-xs text-zinc-text">loading passkeys...</p>
        )}

        {!passkeyState.isPending && passkeys.length === 0 && (
          <p className="mb-4 font-mono text-xs text-zinc-text">
            no passkeys yet. add one to sign in with biometric/device unlock.
          </p>
        )}

        {passkeys.length > 0 && (
          <div className="mb-4 space-y-2">
            {passkeys.map((passkey) => (
              <div
                key={passkey.id}
                className="flex items-center justify-between border border-zinc-border bg-charcoal-light px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-xs text-white">
                      {passkey.name?.trim() || "unnamed passkey"}
                    </span>
                    <code className="font-mono text-xs text-zinc-text">
                      {passkey.id.slice(0, 8)}...
                    </code>
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-zinc-text">
                    created {formatDate(passkey.createdAt)} · device {passkey.deviceType}
                    {passkey.backedUp ? " · backed up" : ""}
                  </div>
                </div>
                {confirmDelete === passkey.id ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => void handleDeletePasskey(passkey.id)}
                      disabled={isDeleting === passkey.id}
                      className="font-mono text-xs text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
                    >
                      {isDeleting === passkey.id ? "removing..." : "confirm"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      disabled={isDeleting === passkey.id}
                      className="font-mono text-xs text-zinc-text transition-colors hover:text-white disabled:opacity-50"
                    >
                      cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(passkey.id)}
                    className="shrink-0 font-mono text-xs text-zinc-text transition-colors hover:text-red-400"
                  >
                    remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

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
                void handleAddPasskey();
              }
            }}
            placeholder="optional passkey name (e.g. macbook)"
            maxLength={48}
            className="min-w-0 flex-1 border border-zinc-border bg-charcoal-light px-3 py-2 font-mono text-sm text-white placeholder-zinc-text outline-none transition-colors focus:border-amber"
          />
          <button
            onClick={() => void handleAddPasskey()}
            disabled={isAdding}
            className="shrink-0 border border-zinc-border bg-charcoal-light px-4 py-2 font-mono text-sm text-amber transition-colors hover:bg-amber hover:text-charcoal disabled:opacity-40 disabled:hover:bg-charcoal-light disabled:hover:text-amber"
          >
            {isAdding ? "adding..." : "add passkey"}
          </button>
        </div>

        {error && <p className="mt-2 font-mono text-sm text-red-400">{error}</p>}
      </div>
    </div>,
    document.body,
  );
}
