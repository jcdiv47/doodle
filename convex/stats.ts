import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId } from "./lib/auth";

export const get = query({
  args: {},
  returns: v.object({
    totalBookmarks: v.number(),
    totalReads: v.number(),
    unreadCount: v.number(),
    withNotesCount: v.number(),
    uniqueTagsCount: v.number(),
    uniqueDomainsCount: v.number(),
    topDomains: v.array(
      v.object({ domain: v.string(), count: v.number() }),
    ),
    topTags: v.array(v.object({ tag: v.string(), count: v.number() })),
    mostRead: v.array(
      v.object({
        title: v.string(),
        url: v.string(),
        favicon: v.optional(v.string()),
        readCount: v.number(),
      }),
    ),
    weeklyActivity: v.array(
      v.object({ weekLabel: v.string(), count: v.number() }),
    ),
    totalMemos: v.number(),
    pinnedMemosCount: v.number(),
    nsfwMemosCount: v.number(),
    memoCreatedTodayCount: v.number(),
    memoUniqueTagsCount: v.number(),
    topMemoTags: v.array(v.object({ tag: v.string(), count: v.number() })),
    memoWeeklyActivity: v.array(
      v.object({ weekLabel: v.string(), count: v.number() }),
    ),
  }),
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) {
      return {
        totalBookmarks: 0,
        totalReads: 0,
        unreadCount: 0,
        withNotesCount: 0,
        uniqueTagsCount: 0,
        uniqueDomainsCount: 0,
        topDomains: [],
        topTags: [],
        mostRead: [],
        weeklyActivity: [],
        totalMemos: 0,
        pinnedMemosCount: 0,
        nsfwMemosCount: 0,
        memoCreatedTodayCount: 0,
        memoUniqueTagsCount: 0,
        topMemoTags: [],
        memoWeeklyActivity: [],
      };
    }

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const memos = await ctx.db
      .query("memos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const totalBookmarks = bookmarks.length;
    let totalReads = 0;
    let unreadCount = 0;
    let withNotesCount = 0;
    const domainCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();

    for (const b of bookmarks) {
      const reads = b.readCount ?? 0;
      totalReads += reads;
      if (reads === 0) unreadCount++;
      if (b.notes) withNotesCount++;

      try {
        const domain = new URL(b.url).hostname.replace(/^www\./, "");
        domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
      } catch {
        // skip malformed URLs
      }

      if (b.tags) {
        for (const tag of b.tags) {
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
      }
    }

    const topDomains = [...domainCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain, count]) => ({ domain, count }));

    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));

    const mostRead = bookmarks
      .filter((b) => (b.readCount ?? 0) > 0)
      .sort((a, b) => (b.readCount ?? 0) - (a.readCount ?? 0))
      .slice(0, 5)
      .map((b) => ({
        title: b.title,
        url: b.url,
        favicon: b.favicon,
        readCount: b.readCount ?? 0,
      }));

    // Weekly activity: last 12 weeks
    const now = Date.now();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeks: { weekLabel: string; count: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const weekStart = now - (i + 1) * msPerWeek;
      const weekEnd = now - i * msPerWeek;
      const count = bookmarks.filter(
        (b) => b._creationTime >= weekStart && b._creationTime < weekEnd,
      ).length;
      const d = new Date(weekStart);
      const weekLabel = `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
      weeks.push({ weekLabel, count });
    }

    const totalMemos = memos.length;
    let pinnedMemosCount = 0;
    let nsfwMemosCount = 0;
    let memoCreatedTodayCount = 0;
    const memoTagCounts = new Map<string, number>();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();

    for (const memo of memos) {
      if (memo.isPinned) pinnedMemosCount += 1;
      if (memo.hasNsfw) nsfwMemosCount += 1;
      if (memo._creationTime >= startOfTodayMs) memoCreatedTodayCount += 1;

      for (const tag of memo.tags) {
        memoTagCounts.set(tag, (memoTagCounts.get(tag) ?? 0) + 1);
      }
    }

    const topMemoTags = [...memoTagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));

    const memoWeeklyActivity: { weekLabel: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = now - (i + 1) * msPerWeek;
      const weekEnd = now - i * msPerWeek;
      const count = memos.filter(
        (memo) => memo._creationTime >= weekStart && memo._creationTime < weekEnd,
      ).length;
      const d = new Date(weekStart);
      const weekLabel = `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
      memoWeeklyActivity.push({ weekLabel, count });
    }

    return {
      totalBookmarks,
      totalReads,
      unreadCount,
      withNotesCount,
      uniqueTagsCount: tagCounts.size,
      uniqueDomainsCount: domainCounts.size,
      topDomains,
      topTags,
      mostRead,
      weeklyActivity: weeks,
      totalMemos,
      pinnedMemosCount,
      nsfwMemosCount,
      memoCreatedTodayCount,
      memoUniqueTagsCount: memoTagCounts.size,
      topMemoTags,
      memoWeeklyActivity,
    };
  },
});
