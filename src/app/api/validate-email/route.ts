import { NextResponse } from "next/server";
import dns from "dns/promises";
import { checkRateLimitKey, getClientIp } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/serverAuth";

// In-memory DNS cache to prevent repeated DNS amplification or network queries
interface DnsCacheEntry {
  valid: boolean;
  mxHost?: string;
  reason?: string;
  message: string;
  expiresAt: number;
}

declare global {
  var __animeverse_dns_cache: Map<string, DnsCacheEntry> | undefined;
}

const dnsCache = globalThis.__animeverse_dns_cache || new Map<string, DnsCacheEntry>();
globalThis.__animeverse_dns_cache = dnsCache;

// Common typos map
const TYPO_DOMAINS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmaill.com": "hotmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "iclud.com": "icloud.com",
  "icoud.com": "icloud.com",
};

// Known temporary / disposable mail domains
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "guerrillamail.com",
  "throwawaymail.com",
  "sharklasers.com",
  "yopmail.com",
  "dispostable.com",
  "trashmail.com",
  "fakeinbox.com",
  "getairmail.com",
  "maildrop.cc",
  "inboxkitten.com",
]);

// Trusted major domains cache (always valid MX)
const KNOWN_VALID_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "zoho.com",
]);

export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ success: false, message: "Invalid request origin." }, { status: 403 });
    }
    const clientIp = getClientIp(request);

    // 1. IP Rate Limiting (max 30 email checks per minute per IP)
    const rateCheck = await checkRateLimitKey(`validate_email:ip:${clientIp}`, 30, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          valid: false,
          reason: "rate_limited",
          message: `Too many email verification requests. Please wait ${rateCheck.resetSeconds}s.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = (body.email || "").toString().trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { valid: false, message: "Please enter an email address." },
        { status: 400 }
      );
    }

    // 2. Syntax check
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        valid: false,
        reason: "invalid_format",
        message: "Invalid email format. Must follow name@domain.com.",
      });
    }

    const [, domain] = email.split("@");
    if (!domain) {
      return NextResponse.json({
        valid: false,
        reason: "invalid_format",
        message: "Invalid domain structure.",
      });
    }

    // 3. Typo suggestion
    if (TYPO_DOMAINS[domain]) {
      const suggestion = email.replace(`@${domain}`, `@${TYPO_DOMAINS[domain]}`);
      return NextResponse.json({
        valid: false,
        reason: "typo",
        suggestion,
        message: `Did you mean ${suggestion}?`,
      });
    }

    // 4. Block temporary / disposable emails
    if (DISPOSABLE_DOMAINS.has(domain)) {
      return NextResponse.json({
        valid: false,
        reason: "disposable",
        message: "Temporary and disposable email addresses are not accepted.",
      });
    }

    // 5. Quick bypass for known top mail providers
    if (KNOWN_VALID_DOMAINS.has(domain)) {
      return NextResponse.json({
        valid: true,
        domain,
        message: "Email provider verified.",
      });
    }

    // 6. Check DNS Cache before querying network
    const now = Date.now();
    const cached = dnsCache.get(domain);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json({
        valid: cached.valid,
        domain,
        reason: cached.reason,
        mxHost: cached.mxHost,
        message: cached.message,
      });
    }

    // 7. Real DNS MX Record Lookup with strict timeout
    try {
      const mxPromise = dns.resolveMx(domain);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DNS_TIMEOUT")), 3500)
      );

      const mxRecords = await Promise.race([mxPromise, timeoutPromise]);

      if (!mxRecords || mxRecords.length === 0) {
        dnsCache.set(domain, {
          valid: false,
          reason: "no_mx",
          message: `The domain "@${domain}" does not have active mail servers to receive emails.`,
          expiresAt: now + 30 * 60 * 1000,
        });

        return NextResponse.json({
          valid: false,
          reason: "no_mx",
          message: `The domain "@${domain}" does not have active mail servers to receive emails.`,
        });
      }

      dnsCache.set(domain, {
        valid: true,
        mxHost: mxRecords[0]?.exchange || "",
        message: "Email domain and active mail servers verified.",
        expiresAt: now + 60 * 60 * 1000, // Cache valid domain for 1 hour
      });

      return NextResponse.json({
        valid: true,
        domain,
        mxHost: mxRecords[0]?.exchange || "",
        message: "Email domain and active mail servers verified.",
      });
    } catch (dnsErr: unknown) {
      const err = dnsErr as { message?: string; code?: string };
      if (err?.message === "DNS_TIMEOUT") {
        return NextResponse.json({
          valid: true,
          domain,
          warning: "Verification timed out, accepted standard format.",
        });
      }

      const code = err?.code || "";
      if (code === "ENOTFOUND" || code === "ENODATA" || code === "SERVFAIL") {
        dnsCache.set(domain, {
          valid: false,
          reason: "domain_not_found",
          message: `The email domain "@${domain}" does not exist on the internet.`,
          expiresAt: now + 30 * 60 * 1000,
        });

        return NextResponse.json({
          valid: false,
          reason: "domain_not_found",
          message: `The email domain "@${domain}" does not exist on the internet.`,
        });
      }

      return NextResponse.json({
        valid: false,
        reason: "dns_error",
        message: `Could not verify "@${domain}". Please check the spelling.`,
      });
    }
  } catch {
    return NextResponse.json(
      { valid: false, message: "Email verification service error." },
      { status: 500 }
    );
  }
}
