"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const fetchMetadata = internalAction({
  args: {
    bookmarkId: v.id("bookmarks"),
    url: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let title = args.url;
    let description = "";
    let favicon: string | undefined;

    try {
      const response = await fetch(args.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; BookmarkManager/1.0)",
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

      // Build favicon URL
      const urlObj = new URL(args.url);
      const iconLinkMatch = html.match(
        /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["'][^>]*>/i
      );
      if (iconLinkMatch) {
        const href = iconLinkMatch[1];
        if (href.startsWith("http")) {
          favicon = href;
        } else if (href.startsWith("//")) {
          favicon = urlObj.protocol + href;
        } else if (href.startsWith("/")) {
          favicon = urlObj.origin + href;
        } else {
          favicon = urlObj.origin + "/" + href;
        }
      } else {
        favicon = urlObj.origin + "/favicon.ico";
      }
    } catch {
      // Keep defaults if fetch fails
    }

    await ctx.runMutation(internal.bookmarks.updateMetadata, {
      bookmarkId: args.bookmarkId,
      title,
      description,
      favicon,
    });

    return null;
  },
});
