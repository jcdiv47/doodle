import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function StatCard({
  label,
  value,
  sub,
  index,
}: {
  label: string;
  value: string | number;
  sub?: string;
  index: number;
}) {
  return (
    <div
      className="animate-fade-in-up border border-zinc-border bg-charcoal-light p-5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <p className="font-mono text-xs uppercase tracking-widest text-zinc-text">
        {label}
      </p>
      <p className="mt-2 font-mono text-3xl font-medium tabular-nums text-white">
        {value}
      </p>
      {sub && (
        <p className="mt-1 font-mono text-xs text-zinc-text">{sub}</p>
      )}
    </div>
  );
}

function ActivityChart({
  weeks,
}: {
  weeks: { weekLabel: string; count: number }[];
}) {
  const max = Math.max(...weeks.map((w) => w.count), 1);

  return (
    <div
      className="animate-fade-in-up border border-zinc-border bg-charcoal-light p-5"
      style={{ animationDelay: "250ms" }}
    >
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-zinc-text">
        activity — last 12 weeks
      </p>
      <div className="flex items-end gap-1.5" style={{ height: "120px" }}>
        {weeks.map((week, i) => {
          const height = max > 0 ? (week.count / max) * 100 : 0;
          return (
            <div
              key={week.weekLabel}
              className="group relative flex flex-1 flex-col items-center justify-end"
              style={{ height: "100%" }}
            >
              <div
                className="w-full rounded-sm bg-amber/20 transition-colors group-hover:bg-amber/50"
                style={{
                  height: `${Math.max(height, 2)}%`,
                  minHeight: "2px",
                  animationDelay: `${300 + i * 40}ms`,
                }}
              />
              {/* Tooltip */}
              <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap border border-zinc-border bg-charcoal px-2 py-1 font-mono text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                {week.count} {week.count === 1 ? "bookmark" : "bookmarks"}
              </div>
              {/* Label every other week */}
              {i % 2 === 0 && (
                <span className="mt-2 font-mono text-[10px] text-zinc-text">
                  {week.weekLabel}
                </span>
              )}
              {i % 2 !== 0 && <span className="mt-2 text-[10px]">&nbsp;</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HorizontalBar({
  label,
  count,
  max,
}: {
  label: string;
  count: number;
  max: number;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="group flex items-center gap-3">
      <span className="w-28 shrink-0 truncate font-mono text-sm text-zinc-text group-hover:text-white transition-colors">
        {label}
      </span>
      <div className="relative h-5 flex-1">
        <div
          className="absolute inset-y-0 left-0 bg-amber/15 transition-all group-hover:bg-amber/30"
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-sm tabular-nums text-white">
        {count}
      </span>
    </div>
  );
}

function RankedList({
  title,
  items,
  delay,
}: {
  title: string;
  items: { label: string; count: number }[];
  delay: number;
}) {
  const max = items.length > 0 ? items[0].count : 1;

  return (
    <div
      className="animate-fade-in-up border border-zinc-border bg-charcoal-light p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-zinc-text">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="font-mono text-sm text-zinc-text">no data yet</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <HorizontalBar
              key={item.label}
              label={item.label}
              count={item.count}
              max={max}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MostReadList({
  bookmarks,
}: {
  bookmarks: {
    title: string;
    url: string;
    favicon?: string;
    readCount: number;
  }[];
}) {
  return (
    <div
      className="animate-fade-in-up border border-zinc-border bg-charcoal-light p-5"
      style={{ animationDelay: "500ms" }}
    >
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-zinc-text">
        most read
      </p>
      {bookmarks.length === 0 ? (
        <p className="font-mono text-sm text-zinc-text">
          no reads tracked yet
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {bookmarks.map((b, i) => (
            <div key={b.url} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-right font-mono text-xs text-zinc-text">
                {i + 1}.
              </span>
              {b.favicon ? (
                <img
                  src={b.favicon}
                  alt=""
                  className="h-4 w-4 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <svg
                  className="h-4 w-4 shrink-0 text-zinc-text"
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
              <a
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate font-mono text-sm text-white transition-colors hover:text-amber"
              >
                {b.title}
              </a>
              <span className="shrink-0 font-mono text-xs tabular-nums text-amber">
                {b.readCount} {b.readCount === 1 ? "read" : "reads"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Dashboard({
  onNavigateBack,
}: {
  onNavigateBack: () => void;
}) {
  const stats = useQuery(api.stats.get);

  if (stats === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-charcoal">
        <div className="font-mono text-sm text-zinc-text">
          loading stats...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal font-sans">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Header */}
        <header className="mb-10 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <img src="/logo.svg" alt="" className="mt-0.5 h-7 w-7" />
            <div>
              <h1 className="font-mono text-2xl font-medium tracking-tight text-white">
                dashboard
              </h1>
              <p className="mt-1 font-mono text-xs text-zinc-text">
                your bookmark stats at a glance
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateBack}
            className="border border-zinc-border bg-charcoal-light px-4 py-2.5 font-mono text-sm text-zinc-text transition-colors hover:bg-charcoal-lighter hover:text-white"
          >
            &larr; bookmarks
          </button>
        </header>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="bookmarks"
            value={stats.totalBookmarks}
            index={0}
          />
          <StatCard
            label="total reads"
            value={stats.totalReads}
            index={1}
          />
          <StatCard
            label="tags"
            value={stats.uniqueTagsCount}
            sub={`${stats.uniqueDomainsCount} domains`}
            index={2}
          />
          <StatCard
            label="unread"
            value={stats.unreadCount}
            sub={`${stats.withNotesCount} with notes`}
            index={3}
          />
        </div>

        {/* Activity chart */}
        <div className="mt-6">
          <ActivityChart weeks={stats.weeklyActivity} />
        </div>

        {/* Two-column: domains + tags */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <RankedList
            title="top domains"
            items={stats.topDomains.map((d) => ({
              label: d.domain,
              count: d.count,
            }))}
            delay={350}
          />
          <RankedList
            title="top tags"
            items={stats.topTags.map((t) => ({
              label: t.tag,
              count: t.count,
            }))}
            delay={420}
          />
        </div>

        {/* Most read */}
        <div className="mt-6">
          <MostReadList bookmarks={stats.mostRead} />
        </div>
      </div>
    </div>
  );
}
