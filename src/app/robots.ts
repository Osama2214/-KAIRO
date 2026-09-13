import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Transactional and administrative surfaces carry no search value.
const PRIVATE_PATHS = ["/admin", "/account", "/checkout", "/api/"];

/**
 * AI assistants that search the web on a shopper's behalf (and the crawlers
 * that feed them). They are allowed by the catch-all rule anyway; naming them
 * makes the intent explicit, so nobody "tidies" them into a block later and
 * quietly takes the store out of ChatGPT, Claude, Perplexity or Gemini answers.
 */
const AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "DuckAssistBot",
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: AI_AGENTS, allow: "/", disallow: PRIVATE_PATHS },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
