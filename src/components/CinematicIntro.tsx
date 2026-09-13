"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useUIStore } from "@/store/useUIStore";
import { useMounted } from "@/store/useWishlistStore";

import backgroundEmblem from "../../public/animat/animeverse-background-emblem.png";
import characterArt from "../../public/animat/animeverse-character.png";
import wordmarkArt from "../../public/animat/animeverse-wordmark.png";
import fullLogo from "../../public/animat/animeverse-full-logo.png";

gsap.registerPlugin(useGSAP);

/**
 * AnimeVerse title sequence — a ~4.3s brand reveal built entirely from the
 * shipped brand assets. No video, no canvas, no redrawn artwork: six PNG
 * layers moved with GPU-friendly transforms, plus a handful of CSS effect
 * layers.
 *
 * The sequence, one continuous move rather than a stack of fades:
 *
 *   the red moon rises out of the void → the character steps out of it on a
 *   short manga impact → the wordmark wipes in from the right → eye glow and
 *   a pass of light across the assembled lockup → hero hold → the whole
 *   lockup shrinks into the navbar logo and the site is live.
 *
 * Two of the six assets are deliberately unused:
 *
 * - `animeverse-red-slash.png` — the wordmark already carries its own red
 *   stroke through the V, and a second slash sweeping over it read as one
 *   effect too many.
 * - `animeverse-circular-logo.png` — the sequence used to open on the circular
 *   emblem for its first second and then dissolve it into the moon and the
 *   character it is made of. That opening was cut, so the sequence now starts
 *   on the moon itself.
 *
 * Both times the remaining scenes were retimed around the gap rather than left
 * with a hole where the cut beat used to be.
 *
 * Two facts about the assets make the composition work and are worth knowing
 * before touching the layout:
 *
 * 1. `animeverse-character.png` and `animeverse-background-emblem.png` are the
 *    same 1374×1145 canvas with different ink on it. Stacked at identical size
 *    they register exactly as they do in the full logo, so the character never
 *    has to be nudged into place against the moon.
 *
 * 2. The navbar mark (`animeverse-mark.png`) is the same horizontal lockup this
 *    intro assembles — small character/moon on the left, wordmark on the right.
 *    That is why scene 08 can fly the group into the navbar's own measured box
 *    and read as the intro logo *becoming* the site logo rather than a
 *    dissolve between two similar images.
 *
 * GSAP note carried over from the previous sequence and still load-bearing:
 * never combine a CSS percentage-translate (`-translate-x-1/2`) with a
 * GSAP-animated `x` on the same axis. GSAP parses the transform once and
 * treats its value as absolute from then on, silently dropping the centring.
 * Use GSAP's own `xPercent`/`yPercent`, which compose with `x`/`y`.
 */

/** Flip to false to show the intro on every home-page landing within a
 *  session (including client-side navigations back to `/`). True is the
 *  shipped behaviour: once per browsing session, surviving a refresh,
 *  dying with the tab. */
const SHOW_INTRO_ONCE_PER_SESSION = true;

/** Safety net, in seconds, armed when the overlay actually appears and run on
 *  GSAP's own ticker — the same clock as the sequence. The timeline ends at
 *  ~4.28s, so this only ever fires if a tween is dropped and onComplete never
 *  arrives. Two details matter and both are deliberate:
 *
 *  - Armed on appearance, not on the decision to play. A page opened in a
 *    background tab holds the overlay's first frame until the tab is looked
 *    at (rAF is suspended there); a wall-clock timer started at that decision
 *    would expire unseen and leave the overlay stuck on screen forever when
 *    the visitor finally arrived.
 *  - GSAP's ticker, not setTimeout, for the same reason: it does not advance
 *    while the tab is hidden, so it can never outrun the sequence it guards. */
const INTRO_FALLBACK_S = 5.2;

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Whether the intro has already played *this visit*.
 *
 * Scoped to the browsing session rather than the device: it should open every
 * visit, but a reload in the middle of one is not a new visit and replaying it
 * there would be tiresome. `sessionStorage` draws exactly that line, and the
 * in-memory flag covers a client-side navigation back to the home page within
 * the same page load.
 */
function hasSeenIntro(): boolean {
  if (typeof window === "undefined") return true;
  if (!SHOW_INTRO_ONCE_PER_SESSION) return false;
  try {
    if ((window as unknown as { __kairo_intro_seen?: boolean }).__kairo_intro_seen) return true;
    if (sessionStorage.getItem("kairo_intro_seen") === "true") return true;
  } catch {
    // Private windows can block storage outright; never loop the intro there.
    return true;
  }
  return false;
}

function markIntroSeen(): void {
  if (typeof window === "undefined") return;
  try {
    (window as unknown as { __kairo_intro_seen?: boolean }).__kairo_intro_seen = true;
    sessionStorage.setItem("kairo_intro_seen", "true");
    // Nothing device-wide is written: the next visit is meant to see it again.
    // Anything left over from when it was remembered for good is cleared, or a
    // returning visitor would go on being skipped forever.
    localStorage.removeItem("kairo_intro_seen");
    document.cookie = "kairo_intro_seen=; path=/; max-age=0; SameSite=Lax";
  } catch {}
}

/**
 * Drop the pre-hydration cover painted by the layout's inline script.
 *
 * Called once the real overlay is on screen, and again on every exit path, so
 * a visitor can never be left looking at the bare cover.
 */
function releaseIntroCover(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("intro-pending");
}

/** The void the emblem emerges from: a single dark-red atmospheric bloom on
 *  near-black, with the edges pulled darker so the centre reads first. */
const VOID_STYLE: React.CSSProperties = {
  backgroundColor: "#050506",
  backgroundImage:
    "radial-gradient(ellipse 50% 42% at 50% 48%, rgba(217,74,58,0.16) 0%, rgba(217,74,58,0.04) 46%, transparent 74%)," +
    // Two vignettes rather than one: a tight circular fall-off that shapes the
    // centre, and a vertical crush that keeps the top and bottom bands darker
    // than the middle. A single radial flattens the frame.
    "radial-gradient(circle at 50% 48%, transparent 24%, rgba(3,3,4,0.92) 78%)," +
    "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.6) 100%)",
};

/** One static grain pass — film stock, not motion. */
const GRAIN_STYLE: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
  backgroundSize: "140px 140px",
};

/** Speed-line angles, in degrees, measured from the emblem's centre. Four on
 *  desktop, three on mobile — deliberately uneven so they read as manga
 *  linework rather than a spoked wheel, and short enough (see the markup)
 *  that they never reach the edge of the frame, which is what made the
 *  earlier pass read as stray lines across the screen rather than impact. */
const SPEED_LINE_ANGLES = [-27, 26, 152, -154];

/** Per-line length multipliers. Four lines of identical length read as a
 *  drawn diagram; uneven ones read as ink. Paired with the angles above so
 *  the two long strokes sit on opposite corners rather than side by side. */
const SPEED_LINE_LENGTHS = [1, 0.72, 0.94, 0.6];

/** Fixed particle offsets (unit vectors × distance factor) rather than
 *  `Math.random()`, so a re-render never reshuffles the burst mid-flight and
 *  server/client markup can never disagree. */
const IMPACT_PARTICLES = [
  { x: -1.0, y: -0.55, s: 1.0 },
  { x: 0.92, y: -0.7, s: 0.75 },
  { x: -0.78, y: 0.66, s: 0.85 },
  { x: 0.83, y: 0.58, s: 0.6 },
  { x: -0.35, y: -1.0, s: 0.7 },
  { x: 0.28, y: 0.98, s: 0.9 },
  { x: 1.0, y: 0.12, s: 0.55 },
  { x: -1.0, y: -0.08, s: 0.65 },
  { x: 0.55, y: -0.95, s: 0.5 },
  { x: -0.6, y: 0.9, s: 0.7 },
];

/** The phone breakpoint the composition switches on. Crossing it mid-sequence
 *  rebuilds the timeline for the other layout — correct, and rare enough over
 *  4.3 seconds not to be worth freezing. */
const COMPACT_QUERY = "(max-width: 767px)";

function subscribeCompact(onChange: () => void): () => void {
  try {
    const mql = window.matchMedia(COMPACT_QUERY);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  } catch {
    return () => {};
  }
}

function getCompact(): boolean {
  try {
    return window.matchMedia(COMPACT_QUERY).matches;
  } catch {
    return false;
  }
}

/** The overlay only ever mounts on the client, so the server snapshot is a
 *  formality — it just has to be stable. */
function getCompactServer(): boolean {
  return false;
}

/**
 * Where the wordmark's ink actually sits inside each of the two images, as
 * fractions of that image's own box. Measured off the files, not guessed,
 * because both carry transparent margin and the navbar mark also carries the
 * small character block on its left:
 *
 *   animeverse-wordmark.png  2172×724, ink 2141×520 at (10, 68)
 *   animeverse-mark.png      1400×377, wordmark ink spans x 0.300–0.994,
 *                            y 0.297–0.966 (the gap at x≈0.29 separates it
 *                            from the character block)
 *
 * Scene 07 lands the intro's wordmark exactly on the navbar's wordmark using
 * these — matching the two outer boxes instead leaves the type a visibly
 * different size at the swap, because the intro lockup and the navbar mark do
 * not share internal proportions (the intro's character is far larger relative
 * to its type).
 */
const WORDMARK_INK = { width: 2141 / 2172, cx: (10 + 2141 / 2) / 2172, cy: (68 + 520 / 2) / 724 };

/**
 * Eye trim on the landing, applied on top of the measured match.
 *
 * The maths below lands the intro's wordmark ink exactly on the navbar mark's
 * wordmark ink — same width, same centre, to a hundredth of a pixel. It still
 * reads a touch large and a touch left, because the intro lockup carries a much
 * bigger character to the left of its type than the navbar mark does, and the
 * eye weighs that mass rather than the geometry. These three numbers are the
 * correction for that, and they are the only place to tune it: `scale` shrinks
 * the whole group a little further, `nudgeX` shifts it right and `nudgeY` lifts
 * it. Both nudges are fractions of the navbar wordmark's own width rather than
 * pixel counts, so the correction holds at every breakpoint.
 */
const LANDING_TRIM = { scale: 0.94, nudgeX: 0.06, nudgeY: -0.05 };
const NAV_MARK_INK = { width: 0.6936, cx: 0.6468, cy: 0.6313 };

/** Slow-drifting atmosphere for the hero hold. Positions are percentages of
 *  the stage so they stay inside the frame at any viewport. */
const HAZE_PARTICLES = [
  { left: 18, top: 70, size: 3, drift: -26, dur: 2.1 },
  { left: 31, top: 28, size: 2, drift: -34, dur: 2.6 },
  { left: 44, top: 82, size: 4, drift: -22, dur: 2.3 },
  { left: 58, top: 36, size: 2, drift: -30, dur: 2.8 },
  { left: 69, top: 74, size: 3, drift: -25, dur: 2.2 },
  { left: 81, top: 44, size: 2, drift: -32, dur: 2.5 },
  { left: 26, top: 52, size: 2, drift: -28, dur: 3.0 },
  { left: 73, top: 22, size: 3, drift: -20, dur: 2.4 },
];

export function CinematicIntro() {
  const pathname = usePathname();
  const mounted = useMounted();
  const [visible, setVisible] = useState(false);
  // Read once: the intro is client-only, so this is known on its first render.
  const [reducedMotion] = useState(prefersReducedMotion);
  // Which composition to build: horizontal lockup, or stacked for phones.
  // Read through useSyncExternalStore rather than a setState-in-effect so the
  // first client render already has the right answer and React never has to
  // re-render the overlay to correct itself.
  const isCompact = useSyncExternalStore(subscribeCompact, getCompact, getCompactServer);

  const isIntroActive = useUIStore((state) => state.isIntroActive);
  const closeIntro = useUIStore((state) => state.closeIntro);
  const playIntro = useUIStore((state) => state.playIntro);

  const containerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const voidGlowRef = useRef<HTMLDivElement>(null);

  const flashRef = useRef<HTMLDivElement>(null);
  const speedLinesRef = useRef<HTMLDivElement>(null);
  const impactBurstRef = useRef<HTMLDivElement>(null);

  const groupRef = useRef<HTMLDivElement>(null);
  const emblemRef = useRef<HTMLDivElement>(null);
  const characterRef = useRef<HTMLDivElement>(null);
  const eyesRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const sweepRef = useRef<HTMLDivElement>(null);
  const keyLightRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  const hazeRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);

  // The site's own navbar logo. Held while the sequence runs and handed back
  // at the moment the intro lockup lands on it, so the two are never on screen
  // together. Kept in a ref because `finish` has to restore it on any exit —
  // a click, a keypress, the safety net — not just the natural ending.
  const navLogoRef = useRef<HTMLElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  /**
   * Give the navbar its logo back.
   *
   * Twice, and with plain DOM writes rather than GSAP, both deliberately.
   * `useGSAP` wraps everything this component animates in a `gsap.context`,
   * and tearing that context down *reverts* it — which re-applies the start
   * value of every tween it owns, including the `opacity: 0` this sequence
   * parks the navbar logo at. A restore that runs before the revert is simply
   * undone by it, and the site is left with a permanently invisible logo until
   * the next full reload. The deferred second pass lands after the revert.
   */
  const releaseNavLogo = useCallback(() => {
    const el = navLogoRef.current;
    if (!el) return;
    const clear = () => {
      el.style.opacity = "";
      el.style.transform = "";
      el.style.transition = "";
    };
    clear();
    setTimeout(clear, 0);
  }, []);
  const idleTweens = useRef<gsap.core.Tween[]>([]);
  const finishedRef = useRef(false);

  const particles = useMemo(
    () => (isCompact ? IMPACT_PARTICLES.slice(0, 5) : IMPACT_PARTICLES),
    [isCompact]
  );
  const hazeDots = useMemo(() => (isCompact ? HAZE_PARTICLES.slice(0, 4) : HAZE_PARTICLES), [isCompact]);
  const speedAngles = useMemo(
    () => (isCompact ? SPEED_LINE_ANGLES.slice(0, 3) : SPEED_LINE_ANGLES),
    [isCompact]
  );

  const finish = useCallback(
    (immediate = false) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      markIntroSeen();
      releaseIntroCover();
      closeIntro();
      timelineRef.current?.kill();
      idleTweens.current.forEach((t) => t.kill());
      idleTweens.current = [];

      // Pointer events go first so the homepage is interactive the instant the
      // sequence is over, even while the last frames of opacity are running.
      if (containerRef.current) containerRef.current.style.pointerEvents = "none";
      releaseNavLogo();

      if (immediate || prefersReducedMotion()) {
        setVisible(false);
        return;
      }
      // Guarded: `finish` can be reached after the overlay has already left
      // the DOM (the fallback timer racing the timeline's own onComplete), and
      // GSAP warns loudly about a null target.
      if (!containerRef.current) {
        setVisible(false);
        return;
      }
      gsap.to(containerRef.current, {
        opacity: 0,
        duration: 0.18,
        ease: "power2.in",
        onComplete: () => setVisible(false),
      });
    },
    [closeIntro, releaseNavLogo]
  );

  useEffect(() => {
    if (!mounted) return;
    if (pathname?.startsWith("/admin")) {
      releaseIntroCover();
      return;
    }

    // Plays on a first landing on the home page, and whenever something asks
    // for it explicitly (the account page replays it after signing up, the dev
    // replay control below asks for it directly).
    const onHome = pathname === "/" || pathname === "";
    const shouldPlay = isIntroActive || (onHome && !hasSeenIntro());
    if (!shouldPlay) {
      // Nothing is going to play, so the pre-hydration cover has to come down.
      // Only here: releasing it anywhere `visible` is still false tears it
      // away before the overlay mounts, and the page flashes through the gap.
      releaseIntroCover();
      return;
    }

    markIntroSeen();
    finishedRef.current = false;

    // The page underneath keeps loading and hydrating throughout — the
    // overlay never gates it.
    // Deferred a task rather than set synchronously in the effect body, so
    // this doesn't trigger a cascading render on mount. A timeout, not a
    // rAF: rAF is suspended whenever the page is not being painted (a
    // background tab, a devtools pane that isn't compositing), and gating the
    // overlay's existence on paint made the sequence unreachable there.
    const timer = setTimeout(() => setVisible(true), 0);
    return () => clearTimeout(timer);
  }, [mounted, pathname, isIntroActive, finish]);

  // The overlay now owns the screen, so the static cover underneath can go.
  // One frame later, so the two never swap on the same paint.
  useEffect(() => {
    if (!visible) return;
    const raf = requestAnimationFrame(() => releaseIntroCover());
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  // Any key or click gets past it immediately.
  useEffect(() => {
    if (!visible) return;
    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [visible, finish]);

  useGSAP(
    () => {
      if (!visible || !containerRef.current) return;
      containerRef.current.style.pointerEvents = "";

      // ── Reduced motion ─────────────────────────────────────────────
      // The whole point of the sequence is a full-screen animated takeover,
      // which is exactly what this preference asks us not to play. Show the
      // static logo for a beat, then hand over to the site.
      if (prefersReducedMotion()) {
        gsap.set(fallbackRef.current, { opacity: 1 });
        gsap.set([groupRef.current, skipRef.current], { opacity: 0 });
        const t = gsap.delayedCall(0.6, () => finish(true));
        return () => t.kill();
      }

      const compact = isCompact;
      // The scaled lines, not their rotation wrappers — see the note in the
      // markup for why those are two separate elements.
      const speedLines = Array.from(
        speedLinesRef.current?.querySelectorAll<HTMLElement>(".intro-speed-line") ?? []
      );

      // ── Scene 07 target: the navbar's own logo ───────────────
      // The image, not its link: the link is a flex child of the navbar's grid
      // and stretches across its whole column (measured, 442px wide against a
      // 178px logo), so landing on the link's box overshoots the logo by 2.5×.
      const targetEl =
        document.querySelector("[data-intro-logo-target] img") ??
        document.querySelector("[data-intro-logo-target]");

      // The intro wordmark's own box, taken now, before the resting state
      // below transforms it. Everything else is measured at the last possible
      // moment instead — see `landing()`.
      const wordmarkBoxNow = wordmarkRef.current?.getBoundingClientRect();

      // Held for the duration of the sequence: with both on screen the closing
      // move reads as one logo sliding on top of an identical one. The navbar's
      // own mark is handed back at the instant the intro lockup settles onto
      // it. Its transition is suppressed too — the navbar image carries a
      // 300ms `transition-all` for its hover brightness, which would otherwise
      // drag this crossfade out over three times its intended length.
      // Phones never hand over to the navbar (see the exit below), so the
      // navbar logo is left completely alone there — not hidden, not held, not
      // restored. Touching it at all on mobile is how it ends up invisible.
      navLogoRef.current = compact ? null : ((targetEl as HTMLElement) ?? null);
      if (navLogoRef.current) {
        navLogoRef.current.style.transition = "none";
        gsap.set(navLogoRef.current, { opacity: 0 });
      }

      /**
       * Where the lockup has to end up, resolved once, when the closing tween
       * actually starts rather than when the timeline is built.
       *
       * The three seconds in between are not dead time: the navbar shrinks its
       * logo on scroll, its left edge moves with the responsive gutter, and a
       * late web font or image can still reflow the row. Measuring at build
       * time and flying to that number lands the lockup wherever the navbar
       * *used* to be — visibly off to one side if the visitor scrolled while
       * the sequence played.
       */
      const land = () => {
        const groupBox = groupRef.current?.getBoundingClientRect();
        const targetBox = targetEl?.getBoundingClientRect();
        if (!groupBox || !targetBox || !wordmarkBoxNow || groupBox.width <= 0) {
          return { x: 0, y: 0, scale: 0.12 };
        }

        // Matched wordmark-to-wordmark, ink to ink. The eye reads the type, and
        // a scale derived from the outer boxes lands it noticeably smaller than
        // the navbar's own — the one mismatch that would give the swap away.
        const introInkW = wordmarkBoxNow.width * WORDMARK_INK.width;
        const introInkCx = wordmarkBoxNow.left + wordmarkBoxNow.width * WORDMARK_INK.cx;
        const introInkCy = wordmarkBoxNow.top + wordmarkBoxNow.height * WORDMARK_INK.cy;

        // getBoundingClientRect returns the *transformed* box, so any scale
        // on the navbar logo has to be divided back out — otherwise the intro
        // matches the size the logo happens to be mid-animation rather than
        // the size it will settle at. This cost a whole round of "it lands too
        // small": the logo used to wait at scale 0.8 for a pop-in, and the
        // lockup dutifully landed at 80% of full size.
        const navScale = Number(gsap.getProperty(targetEl as Element, "scaleX")) || 1;
        const navInkW = (targetBox.width / navScale) * NAV_MARK_INK.width;
        const navInkCx = targetBox.left + targetBox.width * NAV_MARK_INK.cx;
        const navInkCy = targetBox.top + targetBox.height * NAV_MARK_INK.cy;

        // This rect is transformed, and during the flight it is *translated*
        // as well as scaled — so the measured centre is not the layout centre
        // the maths below needs. Scaling happens about the centre and leaves
        // it alone; translation does not, so it is subtracted back out. Miss
        // this and the target chases its own tail: every frame solves for a G
        // that the previous frame just moved.
        const curX = Number(gsap.getProperty(groupRef.current, "x")) || 0;
        const curY = Number(gsap.getProperty(groupRef.current, "y")) || 0;
        const gx = groupBox.left + groupBox.width / 2 - curX;
        const gy = groupBox.top + groupBox.height / 2 - curY;

        // The group scales about its own centre, so a child at C ends up at
        // G + s·(C − G) + d. Solve that for d rather than translating by the
        // difference of the centres, which would be right only if the wordmark
        // sat exactly at the middle of the group — it never does.
        const scale = (navInkW / introInkW) * LANDING_TRIM.scale;
        return {
          scale,
          x: navInkCx + navInkW * LANDING_TRIM.nudgeX - gx - scale * (introInkCx - gx),
          y: navInkCy + navInkW * LANDING_TRIM.nudgeY - gy - scale * (introInkCy - gy),
        };
      };

      // The flight is driven through a proxy so the target can be re-read on
      // every frame instead of being resolved once when the tween starts.
      //
      // This is not belt-and-braces. Measured off a screen recording, the
      // lockup was landing 10% small and 10px left of the navbar mark even
      // though the same numbers came out exact when measured in isolation: the
      // navbar animates its own logo between h-12 and h-10 (with a 300ms
      // `transition-all`) as the page scrolls, so a target resolved at the
      // start of a 0.56s flight can be a stale, mid-transition size by the time
      // the flight ends. Following it frame by frame means the last frame is
      // always the box that is actually there.
      const flight = { p: 0 };
      let flightFrom: { x: number; y: number; s: number } | null = null;
      const readGroup = () => ({
        x: Number(gsap.getProperty(groupRef.current, "x")) || 0,
        y: Number(gsap.getProperty(groupRef.current, "y")) || 0,
        s: Number(gsap.getProperty(groupRef.current, "scaleX")) || 1,
      });

      /** Place the group `k` of the way from where the flight began to where
       *  the navbar logo is *right now*. At k = 1 that is a magnet: whatever
       *  the navbar does, the lockup is back on it the very next frame. */
      const pin = (k: number) => {
        if (!groupRef.current) return;
        // Seeking straight into the middle of the flight skips onStart.
        if (!flightFrom) flightFrom = readGroup();
        const to = land();
        gsap.set(groupRef.current, {
          x: flightFrom.x + (to.x - flightFrom.x) * k,
          y: flightFrom.y + (to.y - flightFrom.y) * k,
          scale: flightFrom.s + (to.scale - flightFrom.s) * k,
        });
      };

      // ── Resting state ──────────────────────────────────────────────
      gsap.set(fallbackRef.current, { opacity: 0 });
      gsap.set(backdropRef.current, { opacity: 1 });
      gsap.set(voidGlowRef.current, { opacity: 0.25, scale: 0.7, xPercent: -50, yPercent: -50 });
      gsap.set(flashRef.current, { opacity: 0, scale: 0.6, xPercent: -50, yPercent: -50 });
      gsap.set(speedLinesRef.current, { opacity: 0 });
      gsap.set(speedLines, { scaleX: 0, opacity: 0 });
      gsap.set(impactBurstRef.current?.children ?? [], { opacity: 0, x: 0, y: 0, scale: 1 });

      gsap.set(groupRef.current, { opacity: 1, scale: 1, x: 0, y: 0 });
      // The moon rises into the frame rather than fading in on the spot, and
      // arrives slightly soft before it sharpens — a horizon coming up, not a
      // picture being switched on.
      gsap.set(emblemRef.current, {
        opacity: 0,
        scale: 0.9,
        y: compact ? 26 : 42,
        filter: `blur(${compact ? 4 : 7}px)`,
      });
      gsap.set(characterRef.current, {
        opacity: 0,
        x: compact ? -26 : -50,
        scale: 0.94,
        filter: `blur(${compact ? 2.5 : 4}px)`,
      });
      gsap.set(eyesRef.current, { opacity: 0 });
      gsap.set(wordmarkRef.current, {
        opacity: 0,
        x: compact ? 48 : 100,
        scale: 0.96,
        clipPath: "inset(0% 100% 0% 0%)",
      });
      gsap.set(sweepRef.current, { opacity: 0, xPercent: -150 });
      gsap.set(keyLightRef.current, { opacity: 0, scale: 0.55, xPercent: -50, yPercent: -50 });
      gsap.set(groundRef.current, { opacity: 0, scaleX: 0.45 });
      gsap.set(hazeRef.current, { opacity: 0 });
      gsap.set(skipRef.current, { opacity: 0, y: 8 });

      const tl = gsap.timeline({
        onComplete: () => finish(true),
      });
      timelineRef.current = tl;
      const guard = gsap.delayedCall(INTRO_FALLBACK_S, () => finish(true));
      // Dev-only handle for tuning: `__introTl.pause(2.1)` parks the sequence
      // on any beat so a scene can be looked at rather than caught in passing.
      if (process.env.NODE_ENV !== "production") {
        const w = window as unknown as {
          __introTl?: gsap.core.Timeline;
          __introGuard?: gsap.core.Tween;
        };
        w.__introTl = tl;
        // The safety net, exposed with it: stepping through the closing frames
        // by hand takes longer than the net's own timeout, so it has to be
        // killable while tuning.
        w.__introGuard = guard;
      }

      tl
        // ── ACT I · 0.00–0.35 — THE VOID ────────────────────────
        // Black, grain, and one ember of crimson breathing at the centre. No
        // artwork yet — a third of a second of empty frame is what makes the
        // moon an arrival rather than the first slide of a sequence.
        .to(voidGlowRef.current, { opacity: 0.34, scale: 0.9, duration: 0.42, ease: "power2.out" }, 0)

        // ── ACT II · 0.35–1.05 — THE MOON RISES ─────────────────
        // The scenery comes up from below and sharpens as it settles: red moon,
        // torii, mountains, birds. Position, scale and focus on one tween, so
        // it reads as one move rather than three effects.
        .to(
          emblemRef.current,
          { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "power3.out" },
          0.35
        )
        // The scene is lit before anything stands in it — key light with the
        // moon, contact pool a beat later so the horizon has ground under it.
        .to(
          keyLightRef.current,
          { opacity: compact ? 0.45 : 0.62, scale: 1, duration: 0.8, ease: "power2.out" },
          0.35
        )
        .to(voidGlowRef.current, { opacity: 0.22, scale: 1.2, duration: 0.7, ease: "power2.out" }, 0.5)
        .to(
          groundRef.current,
          { opacity: compact ? 0.35 : 0.5, scaleX: 1, duration: 0.7, ease: "power2.out" },
          0.62
        )

        // ── ACT III · 1.05–1.70 — THE FIGURE ───────────────────
        // He steps out of the moon: in from the left, soft, and resolving sharp
        // on his mark.
        .to(
          characterRef.current,
          { opacity: 1, x: 0, scale: 1, filter: "blur(0px)", duration: 0.6, ease: "power3.out" },
          1.05
        )
        // The hit lands on the frame he does — not earlier, or it punctuates
        // nothing. One snap of scale, a crimson flash behind him, four ink
        // strokes thrown outward, and it is over inside a quarter-second.
        .to(groupRef.current, { scale: 1.035, duration: 0.09, ease: "power2.out" }, 1.42)
        .to(groupRef.current, { scale: 1, duration: 0.26, ease: "power2.inOut" }, 1.51)
        .to(flashRef.current, { opacity: 0.42, scale: 1, duration: 0.07, ease: "power2.out" }, 1.42)
        .to(flashRef.current, { opacity: 0, duration: 0.28, ease: "power2.in" }, 1.49)
        .set(speedLinesRef.current, { opacity: 1 }, 1.42)
        .to(
          speedLines,
          {
            scaleX: 1,
            opacity: compact ? 0.2 : 0.3,
            duration: 0.13,
            ease: "power3.out",
            stagger: 0.02,
          },
          1.42
        )
        .to(speedLines, { opacity: 0, duration: 0.18, ease: "power2.in", stagger: 0.015 }, 1.6)
        .to(
          impactBurstRef.current?.children ?? [],
          { opacity: 0.8, duration: 0.05, ease: "none", stagger: 0.005 },
          1.42
        )
        .to(
          impactBurstRef.current?.children ?? [],
          {
            x: (i: number) => particles[i].x * (compact ? 80 : 132),
            y: (i: number) => particles[i].y * (compact ? 80 : 132),
            scale: 0.25,
            opacity: 0,
            duration: 0.5,
            ease: "power2.out",
          },
          1.45
        )

        // ── ACT IV · 1.70–2.40 — THE NAME ─────────────────────
        // A beat of quiet after the hit, then the wordmark wipes in from the
        // right and lands beside him. A clip does the revealing while position
        // and scale carry the momentum; the artwork is never stretched, and its
        // own red stroke through the V is the only slash in the sequence.
        .to(
          wordmarkRef.current,
          {
            opacity: 1,
            x: 0,
            scale: 1,
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 0.7,
            ease: "power3.out",
          },
          1.7
        )
        // The way out, offered quietly once there is a logo to skip, and gone
        // before the closing move so it never flies to the navbar with it.
        .to(skipRef.current, { opacity: 0.45, y: 0, duration: 0.3, ease: "power2.out" }, 2.0)

        // ── ACT V · 2.40–3.20 — THE HERO SHOT ──────────────────
        // The shot the sequence exists for. The camera leans in a fraction and
        // settles; after this nothing moves except light.
        .to(groupRef.current, { scale: 1.025, duration: 0.42, ease: "sine.inOut" }, 2.4)
        .to(groupRef.current, { scale: 1, duration: 0.42, ease: "sine.inOut" }, 2.82)
        // One pass of light behind the artwork. Soft-edged and unclipped: an
        // earlier version travelled inside a clipped box and painted a visible
        // rectangular panel behind the lockup every time it passed.
        .to(sweepRef.current, { opacity: compact ? 0.26 : 0.38, duration: 0.16, ease: "power2.out" }, 2.35)
        .to(sweepRef.current, { xPercent: 150, duration: 0.95, ease: "power1.inOut" }, 2.35)
        .to(sweepRef.current, { opacity: 0, duration: 0.26, ease: "power2.in" }, 3.0)
        // As that light crosses his face his eyes catch it — one pulse, about
        // 0.2s, never a continuous glow. Shape and artwork untouched: this is a
        // screen-blended highlight sitting exactly over them.
        .to(eyesRef.current, { opacity: 0.5, duration: 0.07, ease: "power2.out" }, 2.72)
        .to(eyesRef.current, { opacity: 0.92, duration: 0.06, ease: "power2.out" }, 2.79)
        .to(eyesRef.current, { opacity: 0, duration: 0.1, ease: "power2.inOut" }, 2.85)
        .to(keyLightRef.current, { opacity: compact ? 0.5 : 0.7, duration: 0.38, ease: "sine.inOut" }, 2.45)
        .to(hazeRef.current, { opacity: 1, duration: 0.32, ease: "power2.out" }, 2.55)
        .to(keyLightRef.current, { opacity: compact ? 0.42 : 0.58, duration: 0.38, ease: "sine.inOut" }, 2.85)

        // ── ACT VI · 3.05→ — THE WAY OUT ───────────────────────
        // Common to both compositions: the affordance and the atmosphere leave
        // first, whatever happens to the lockup after them.
        .to(skipRef.current, { opacity: 0, y: -4, duration: 0.18, ease: "power2.in" }, 3.05)
        .to(hazeRef.current, { opacity: 0, duration: 0.28, ease: "power2.in" }, 3.15);

      if (compact) {
        // ── PHONES · 3.20–3.80 — IT SIMPLY ENDS ─────────────────
        //
        // No flight, no handover, nothing aimed at the navbar. The stacked
        // phone composition is a completely different shape from the navbar's
        // horizontal mark, so flying one into the other lands a tall lockup on
        // a wide box — it cannot be made to match, and trying is what made the
        // ending look broken on a phone. The sequence closes on itself instead:
        // the composition eases back a fraction and the whole overlay goes.
        tl.to(groupRef.current, { scale: 0.94, duration: 0.6, ease: "power2.in" }, 3.2)
          .to(
            [emblemRef.current, characterRef.current],
            { opacity: 0, duration: 0.46, ease: "power2.in" },
            3.2
          )
          .to(
            [keyLightRef.current, groundRef.current],
            { opacity: 0, duration: 0.42, ease: "power2.in" },
            3.2
          )
          .to(backdropRef.current, { opacity: 0, duration: 0.46, ease: "power2.inOut" }, 3.3)
          .to(voidGlowRef.current, { opacity: 0, duration: 0.42, ease: "power2.in" }, 3.3)
          .to(containerRef.current, { opacity: 0, duration: 0.34, ease: "power2.inOut" }, 3.44)
          // Input reaches the site before the last frames of opacity finish.
          .call(
            () => {
              if (containerRef.current) containerRef.current.style.pointerEvents = "none";
            },
            undefined,
            3.5
          )
          .set({}, {}, 3.82);
      } else {
        // ── DESKTOP · 3.20–4.05 — BECOMING THE SITE ──────────────
        //
        // One continuous move that ends in a swap, with no pause anywhere in
        // it. An earlier cut held the landed lockup still for a third of a
        // second before starting the swap, and that hold was the problem: by
        // then the backdrop is gone and the site is up, so a motionless logo on
        // a live page does not read as a beat — it reads as a freeze.
        //
        //   3.20 → 3.95   flies to the navbar logo and decelerates into it;
        //                  the void, the moon and the lighting all finish
        //                  leaving on the same frame
        //   3.95 → 4.05   the lockup and the navbar's own logo cross-fade
        tl.to(
          flight,
          {
            p: 1,
            duration: 0.75,
            // Decelerating rather than in-and-out: the move should still be
            // visibly slowing as the swap takes over, so the two read as one
            // gesture instead of a move and then an event.
            ease: "power3.out",
            onStart: () => {
              flightFrom = readGroup();
            },
            onUpdate: () => pin(flight.p),
          },
          3.2
        )
          // Magnet. The flight is over at 3.95 but the lockup is still on
          // screen through the cross-fade, and the navbar can move under it in
          // that window — its logo animates size on scroll, and a late image or
          // font can reflow the row. This tween changes nothing; it exists so
          // `pin(1)` runs on every frame until the lockup is gone.
          .to(
            flight,
            {
              p: 1,
              duration: 0.1,
              ease: "none",
              onUpdate: () => pin(1),
            },
            3.95
          )
          // The scenery, the lighting and the figure all leave *during* the
          // flight and land on zero with it. What actually arrives at the
          // navbar is the wordmark — the one element that matches the navbar
          // mark exactly — with everything that does not match already gone.
          .to(emblemRef.current, { opacity: 0, duration: 0.44, ease: "power2.in" }, 3.2)
          .to(keyLightRef.current, { opacity: 0, duration: 0.48, ease: "power2.in" }, 3.2)
          .to(groundRef.current, { opacity: 0, duration: 0.46, ease: "power2.in" }, 3.2)
          // The intro's character is far larger than the small figure baked
          // into the navbar mark; it is the one part a cross-fade cannot
          // disguise, so it is down to nothing before the swap starts.
          .to(characterRef.current, { opacity: 0, duration: 0.42, ease: "power2.in" }, 3.26)
          // The void goes out with the move, finishing on the same frame the
          // lockup lands. Opening it earlier leaves a big logo sliding over a
          // live homepage; later, and the swap happens against a dark screen.
          .to(backdropRef.current, { opacity: 0, duration: 0.52, ease: "power2.inOut" }, 3.43)
          .to(voidGlowRef.current, { opacity: 0, duration: 0.48, ease: "power2.in" }, 3.43)
          // The swap: 0.10s, both directions at once, starting the frame the
          // flight ends. By this point the two are the same artwork at the same
          // size in the same place, so the overlap is invisible — whereas any
          // gap between them, even two frames, reads as a cut.
          .to(containerRef.current, { opacity: 0, duration: 0.1, ease: "none" }, 3.95)
          .to(navLogoRef.current, { opacity: 1, duration: 0.1, ease: "none" }, 3.95)
          // Input reaches the site the moment the swap begins.
          .call(
            () => {
              if (containerRef.current) containerRef.current.style.pointerEvents = "none";
            },
            undefined,
            3.95
          )
          .call(() => releaseNavLogo(), undefined, 4.07)
          .set({}, {}, 4.12);
      }

      return () => {
        guard.kill();
        // Whatever tears this down — a route change, a hot reload, the user
        // navigating away mid-sequence — the navbar must never be left holding
        // an invisible logo.
        releaseNavLogo();
      };
    },
    { scope: containerRef, dependencies: [visible, isCompact, releaseNavLogo] }
  );

  // Layout numbers, resolved per breakpoint rather than sprinkled through the
  // markup: horizontal lockup on desktop/tablet, stacked on phones.
  const characterBox = isCompact
    ? "w-[62vw] max-w-[330px]"
    : "w-[34vw] max-w-[420px] lg:w-[32vw]";
  const wordmarkBox = isCompact ? "w-[74vw] max-w-[360px]" : "w-[38vw] max-w-[520px]";

  return (
    <>
      {visible && (
        <div
          ref={containerRef}
          role="presentation"
          aria-hidden="true"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden select-none"
        >
          {/* ── Backdrop: the void ─────────────────────────────────────── */}
          <div ref={backdropRef} className="absolute inset-0" style={VOID_STYLE} />
          <div className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay" style={GRAIN_STYLE} />

          {/* The single atmospheric red source. Centred by GSAP's own
              xPercent/yPercent — see the transform note at the top. */}
          <div
            ref={voidGlowRef}
            className="absolute left-1/2 top-1/2 w-[70vw] max-w-[760px] h-[70vw] max-h-[760px] rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(217,74,58,0.30) 0%, rgba(217,74,58,0.09) 42%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />

          {/* ── Scene 07 atmosphere ────────────────────────────────────── */}
          <div ref={hazeRef} className="absolute inset-0 pointer-events-none">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 60% 40% at 50% 55%, rgba(217,74,58,0.08) 0%, transparent 70%)",
              }}
            />
            {hazeDots.map((p, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-vermilion kairo-intro-ember"
                style={{
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                  width: p.size,
                  height: p.size,
                  opacity: 0.5,
                  ["--ember-drift" as string]: `${p.drift}px`,
                  animationDuration: `${p.dur}s`,
                }}
              />
            ))}
          </div>

          {/* ── Impact effects ──────────────────────────────── */}
          <div
            ref={flashRef}
            className="absolute left-1/2 top-1/2 w-[46vw] max-w-[520px] h-[46vw] max-h-[520px] rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(255,90,70,0.85) 0%, rgba(217,74,58,0.35) 38%, transparent 68%)",
              filter: "blur(24px)",
            }}
          />

          {/* Manga speed lines, drawn from behind the emblem outward. Each
              line owns its rotation on a wrapper so GSAP animates scaleX on
              the inner element without fighting the transform. */}
          {/* The rotation lives on a wrapper and the scaled line inside it,
              offset with a margin rather than a second transform. GSAP parses
              an element's transform into its own matrix the first time it
              touches it, so a hand-written `rotate() translateX()` on the same
              node it animates `scaleX` on would be re-composed and land the
              line somewhere other than where it was authored. */}
          <div ref={speedLinesRef} className="absolute left-1/2 top-1/2 pointer-events-none">
            {speedAngles.map((angle, i) => (
              <span
                key={angle}
                className="absolute block origin-left"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <span
                  className="intro-speed-line block h-px origin-left"
                  style={{
                    // Short, tapered at both ends, and each a different
                    // length: a stroke of ink thrown off the impact, not a
                    // rule pointing at the emblem.
                    width: `calc(${isCompact ? "15vw" : "11vw"} * ${SPEED_LINE_LENGTHS[i]})`,
                    marginLeft: isCompact ? 100 : 166,
                    background:
                      i % 2 === 0
                        ? "linear-gradient(90deg, rgba(217,74,58,0) 0%, rgba(217,74,58,0.9) 30%, rgba(217,74,58,0) 100%)"
                        : "linear-gradient(90deg, rgba(244,240,232,0) 0%, rgba(244,240,232,0.62) 30%, rgba(244,240,232,0) 100%)",
                  }}
                />
              </span>
            ))}
          </div>

          <div ref={impactBurstRef} className="absolute left-1/2 top-1/2 pointer-events-none">
            {particles.map((p, i) => (
              <span
                key={i}
                className="absolute block rounded-full bg-vermilion"
                style={{ width: 2 + p.s * 3, height: 2 + p.s * 3 }}
              />
            ))}
          </div>

          {/* ── The assembled lockup ───────────────────────────────────────
              Layer order is the spec's, back to front: background emblem →
              character → wordmark → light. `groupRef` is the single
              transform handle the push-in and the flight to the navbar both
              use, so the composition never comes apart. */}
          <div
            ref={groupRef}
            className={`relative z-10 flex items-center justify-center ${
              isCompact ? "flex-col gap-3 px-6" : "flex-row gap-[2vw] px-8"
            }`}
          >
            {/* ── Lighting ──────────────────────────────────────────────
                Three soft sources, no hard geometry anywhere. Every one of
                them is an unclipped, heavily blurred radial: the previous
                pass ran its sweep inside a clipped box, which painted a
                visible rectangular panel behind the artwork on every pass.

                Key light — a standing warm bloom the moon rises into, so the
                scene is lit before the figure arrives in it. */}
            <div
              ref={keyLightRef}
              className="absolute left-[30%] top-1/2 w-[70%] h-[130%] rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 50%, rgba(217,74,58,0.34) 0%, rgba(150,40,32,0.14) 44%, transparent 72%)",
                filter: "blur(56px)",
              }}
            />

            {/* Contact pool — a low, wide glow under the lockup so it sits in
                the frame instead of floating on it. */}
            <div
              ref={groundRef}
              className="absolute left-1/2 bottom-[-14%] w-[86%] h-[22%] -translate-x-1/2 rounded-[50%] pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 50%, rgba(217,74,58,0.26) 0%, rgba(217,74,58,0.07) 45%, transparent 74%)",
                filter: "blur(34px)",
              }}
            />

            {/* The pass of light itself: one soft ellipse crossing behind the
                artwork, wider than it is tall and blurred past any edge. */}
            <div
              ref={sweepRef}
              className="absolute left-1/2 top-1/2 w-[46%] h-[120%] -translate-y-1/2 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 50%, rgba(255,142,120,0.55) 0%, rgba(255,190,175,0.22) 40%, transparent 72%)",
                filter: "blur(46px)",
              }}
            />

            {/* LAYER 1 + LAYER 2 — the moon behind, the character in front.
                Same source canvas, so stacking them at identical size
                reproduces the registration of the original artwork exactly;
                the emblem is pushed marginally larger so it reads as scenery
                sitting behind the figure. */}
            <div className={`relative ${characterBox} shrink-0`}>
              <div ref={emblemRef} className="absolute inset-0 -m-[9%] pointer-events-none">
                <Image
                  src={backgroundEmblem}
                  alt=""
                  sizes="(max-width: 767px) 70vw, 460px"
                  quality={90}
                  priority
                  className="w-full h-auto"
                />
              </div>

              <div ref={characterRef} className="relative">
                <Image
                  src={characterArt}
                  alt=""
                  sizes="(max-width: 767px) 62vw, 420px"
                  quality={90}
                  priority
                  className="w-full h-auto drop-shadow-[0_10px_26px_rgba(0,0,0,0.75)]"
                />

                {/* The eye catch-light. Positioned as a fraction of the
                    character's own box — the artwork is untouched, this only
                    adds light over it. */}
                <div ref={eyesRef} className="absolute inset-0 pointer-events-none mix-blend-screen">
                  <span
                    className="absolute rounded-full"
                    style={{
                      left: "30.2%",
                      top: "47.2%",
                      width: "4.2%",
                      aspectRatio: "1",
                      transform: "translate(-50%, -50%)",
                      background:
                        "radial-gradient(circle, rgba(255,120,95,0.95) 0%, rgba(217,74,58,0.45) 45%, transparent 72%)",
                      filter: "blur(2px)",
                    }}
                  />
                  <span
                    className="absolute rounded-full"
                    style={{
                      left: "48.6%",
                      top: "46.4%",
                      width: "4.2%",
                      aspectRatio: "1",
                      transform: "translate(-50%, -50%)",
                      background:
                        "radial-gradient(circle, rgba(255,120,95,0.95) 0%, rgba(217,74,58,0.45) 45%, transparent 72%)",
                      filter: "blur(2px)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* LAYER 3 — the wordmark. */}
            <div className={`relative ${wordmarkBox} shrink-0`}>
              <div ref={wordmarkRef} className="relative">
                <Image
                  src={wordmarkArt}
                  alt="AnimeVerse"
                  sizes="(max-width: 767px) 74vw, 520px"
                  quality={90}
                  priority
                  className="w-full h-auto"
                />
              </div>

            </div>
          </div>

          {/* Reduced-motion fallback: the shipped static logo, nothing moving. */}
          <div ref={fallbackRef} className="absolute z-20 w-[70vw] max-w-[520px] opacity-0 pointer-events-none">
            {/* Only fetched for visitors who asked for reduced motion: for
                everyone else this layer stays invisible, and loading it at
                high priority cost ~100KB on every first visit. */}
            {reducedMotion && (
              <Image src={fullLogo} alt="AnimeVerse" sizes="(max-width: 767px) 70vw, 520px" quality={90} priority className="w-full h-auto" />
            )}
          </div>

          {/* A quiet affordance rather than a progress bar racing the sequence. */}
          <button
            ref={skipRef}
            type="button"
            onClick={() => finish()}
            className="absolute bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2 z-30 font-mono text-[9px] sm:text-[10px] tracking-[0.28em] uppercase text-paper/70 hover:text-vermilion transition-colors cursor-pointer"
          >
            <span className="inline-flex items-center gap-3">
              <span className="h-px w-6 bg-vermilion/40" />
              Enter
              <span className="h-px w-6 bg-vermilion/40" />
            </span>
          </button>
        </div>
      )}

      {/* Dev-only replay control. Renders regardless of `visible` so the
          sequence is always reachable while tuning it, without fighting
          sessionStorage. */}
      {process.env.NODE_ENV !== "production" && (
        <button
          type="button"
          onClick={() => {
            // Cleared first: `playIntro()` only starts a run by *changing*
            // isIntroActive, so asking for one while a previous run is still
            // flagged active is a no-op — which is exactly the state you are
            // in after pausing the timeline by hand to look at a frame.
            finishedRef.current = false;
            closeIntro();
            // A timeout, not a rAF, for the same reason the mount uses one:
            // rAF never runs while the page isn't being painted, and the
            // replay control then does nothing at all.
            setTimeout(() => playIntro(), 0);
          }}
          className="fixed bottom-3 left-3 z-[200] rounded-sm border border-vermilion/30 bg-ink/90 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-vermilion/70 backdrop-blur-sm transition-colors hover:border-vermilion/60 hover:text-vermilion cursor-pointer"
        >
          ⟲ Replay intro
        </button>
      )}
    </>
  );
}
