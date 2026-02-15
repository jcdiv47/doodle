import { useEffect, useRef, useState } from "react";
import { api } from "../convex/_generated/api";
import { useCachedQuery } from "./lib/useCachedQuery";
import { ApiKeySettings } from "./ApiKeySettings";
import { PasskeySettings } from "./PasskeySettings";

export function UserBadge({
  onSignOut,
  onNavigateToStats,
}: {
  onSignOut: () => Promise<void>;
  onNavigateToStats?: () => void;
}) {
  const user = useCachedQuery(api.users.me, {}, "users:me");
  const [open, setOpen] = useState(false);
  const [apiKeysOpen, setApiKeysOpen] = useState(false);
  const [passkeysOpen, setPasskeysOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const name = user?.name ?? user?.email ?? "user";
  const initials = name.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-zinc-border transition-colors hover:border-amber"
      >
        {user?.image ? (
          <img
            src={user.image}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="font-mono text-xs font-medium text-zinc-text">
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 border border-zinc-border bg-charcoal-light shadow-lg">
          <div className="border-b border-zinc-border px-4 py-3">
            {user?.name && (
              <p className="truncate font-mono text-sm text-white">
                {user.name}
              </p>
            )}
            {user?.email && (
              <p className="truncate font-mono text-xs text-zinc-text">
                {user.email}
              </p>
            )}
          </div>
          {onNavigateToStats && (
            <button
              onClick={() => {
                onNavigateToStats();
                setOpen(false);
              }}
              className="w-full px-4 py-2.5 text-left font-mono text-xs text-zinc-text transition-colors hover:bg-charcoal hover:text-white"
            >
              stats
            </button>
          )}
          <button
            onClick={() => {
              setPasskeysOpen(true);
              setOpen(false);
            }}
            className="w-full px-4 py-2.5 text-left font-mono text-xs text-zinc-text transition-colors hover:bg-charcoal hover:text-white"
          >
            passkeys
          </button>
          <button
            onClick={() => {
              setApiKeysOpen(true);
              setOpen(false);
            }}
            className="w-full px-4 py-2.5 text-left font-mono text-xs text-zinc-text transition-colors hover:bg-charcoal hover:text-white"
          >
            api keys
          </button>
          <button
            onClick={() => void onSignOut()}
            className="w-full px-4 py-2.5 text-left font-mono text-xs text-zinc-text transition-colors hover:bg-charcoal hover:text-white"
          >
            sign out
          </button>
        </div>
      )}
      <ApiKeySettings
        isOpen={apiKeysOpen}
        onClose={() => setApiKeysOpen(false)}
      />
      <PasskeySettings
        isOpen={passkeysOpen}
        onClose={() => setPasskeysOpen(false)}
      />
    </div>
  );
}
