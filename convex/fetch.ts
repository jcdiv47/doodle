"use node";

import { internalAction, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

function resolveHref(href: string, urlObj: URL): string {
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return urlObj.protocol + href;
  if (href.startsWith("/")) return urlObj.origin + href;
  return urlObj.origin + "/" + href;
}

function extractFavicon(html: string, urlObj: URL): string | undefined {
  // Try matching <link> tags with rel containing "icon" (covers icon, shortcut icon, apple-touch-icon)
  // Handle both href-before-rel and rel-before-href orderings
  const patterns = [
    /<link[^>]*rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'][^"']*icon[^"']*["'][^>]*>/gi,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match) {
      return resolveHref(match[1], urlObj);
    }
  }

  return undefined;
}

async function extractMetadata(url: string) {
  let title = url;
  let description = "";
  let favicon: string | undefined;
  const urlObj = new URL(url);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    const html = await response.text();

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

    // Extract favicon from HTML
    favicon = extractFavicon(html, urlObj);

    // Fallback to /favicon.ico
    if (!favicon) {
      favicon = urlObj.origin + "/favicon.ico";
    }
  } catch {
    // If fetch fails entirely, use Google's favicon service as fallback
    favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
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
