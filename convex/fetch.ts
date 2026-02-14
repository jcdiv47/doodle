"use node";

import { internalAction, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

function googleFavicon(hostname: string): string {
  return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
}

async function fetchHead(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(5000),
  });

  const reader = response.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let html = "";
  const maxBytes = 32_768; // 32 KB — more than enough for <head>

  while (html.length < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
    if (/<\/head\s*>/i.test(html)) break;
  }

  reader.cancel();
  return html;
}

async function extractMetadata(url: string) {
  let title = url;
  let description = "";
  const urlObj = new URL(url);
  const favicon = googleFavicon(urlObj.hostname);

  try {
    const html = await fetchHead(url);

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].trim().replace(/\s+/g, " ");
    }

    // Extract meta description
    const descMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i
    );
    if (!descMatch) {
      const descMatch2 = html.match(
        /<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["'][^>]*>/i
      );
      if (descMatch2) {
        description = descMatch2[1].trim().replace(/\s+/g, " ");
      }
    } else {
      description = descMatch[1].trim().replace(/\s+/g, " ");
    }

    // Extract og:description as fallback
    if (!description) {
      const ogMatch = html.match(
        /<meta[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i
      );
      if (ogMatch) {
        description = ogMatch[1].trim().replace(/\s+/g, " ");
      }
    }
  } catch {
    // title/description stay as defaults, favicon is always from Google
  }

  return { title, description, favicon };
}

export const previewUrl = action({
  args: { url: v.string() },
  returns: v.object({
    title: v.string(),
    description: v.string(),
    favicon: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    return await extractMetadata(args.url);
  },
});

export const fetchMetadata = internalAction({
  args: {
    bookmarkId: v.id("bookmarks"),
    url: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { title, description, favicon } = await extractMetadata(args.url);

    await ctx.runMutation(internal.bookmarks.updateMetadata, {
      bookmarkId: args.bookmarkId,
      title,
      description,
      favicon,
    });

    return null;
  },
});
