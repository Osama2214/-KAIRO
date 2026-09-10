"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useUIStore } from "@/store/useUIStore";
import { useMounted } from "@/store/useWishlistStore";
import storeMark from "../../public/animeverse-mark.png";

gsap.registerPlugin(useGSAP);

/**
 * Opening title sequence.
 *
 * One hero element: the existing AnimeVerse lockup, used exactly as it
 * ships and never redrawn.
 *
 * Two real bugs were behind the last "it barely moves" report, both fixed
 * here rather than papered over with bigger numbers:
 *
 * 1. The mark's reveal was split into three tweens sharing a start time but
 *    different durations and eases (opacity fast + power1, blur/scale slow
 *    + power3). power3.out is heavily front-loaded, so by the time opacity
 *    finished, blur and scale were already ~70% resolved — the "reveal"
 *    was mostly over before it was visible enough to watch. Fixed by
 *    animating opacity, blur, scale, position and rotation together in one
 *    tween, one duration, one (more moderate) ease, starting from a
 *    non-zero opacity — a true rack-focus, not a pop-then-settle.
 *
 * 2. Several elements (the glows, the vertical spine) combined a CSS
 *    percentage-translate class for centring with a GSAP-animated x/y on
 *    that same axis. GSAP parses an element's transform once on first
 *    touch and treats whatever axis you hand it as absolute from then on —
 *    so the centring offset was silently replaced, not added to, the
 *    moment GSAP set a value on it. Fixed with GSAP's own xPercent/yPercent
 *    (which compose correctly with animated x/y) instead of a CSS class.
 *
 * The story: the room opens first (texture, then light drifting in from
 * off-centre) → the light finishes arriving at its post as anticipation →
 * the mark resolves through a single unified rack-focus move, light still
 * climbing and drifting slightly, peaking as it lands → a real overshoot,
 * not a pulse → light recedes → the rule draws → the taglines arrive
 * staggered → the frame and its labels settle in last, slowest, with a
 * bigger retraction than before → everything stops except a slow breathing
 * drift on the two glows. The mark itself never repeats.
 *
 * Reduced motion never sees any of this; hasSeenIntro() below treats that
 * preference the same as already seen.
 */

/** Hold after the last beat settles, before the auto-exit fires. Every beat
 *  in the timeline below is scaled ~0.62× from the original pass — same
 *  deltas, same eases, same hierarchy and stagger relationships, just
 *  compressed in time for a snappier read. */
const INTRO_MS = 3150;

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function hasSeenIntro(): boolean {
  if (typeof window === "undefined") return true;
  // A full-screen animated takeover is exactly what reduced-motion asks us not
  // to play, so treat it as already seen.
  if (prefersReducedMotion()) return true;
  try {
    if ((window as unknown as { __kairo_intro_seen?: boolean }).__kairo_intro_seen) return true;
    if (document.cookie.split(";").some((c) => c.trim().startsWith("kairo_intro_seen=true"))) return true;
    if (localStorage.getItem("kairo_intro_seen") === "true") return true;
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
    localStorage.setItem("kairo_intro_seen", "true");
    document.cookie = "kairo_intro_seen=true; path=/; max-age=86400; SameSite=Lax";
  } catch {}
}

/** The base "room" the mark stands in — a composited gradient, not a flat
 *  fill and not a single radial. A warm, slightly off-centre ellipse (echoes
 *  the mark's own sun-disc without redrawing it) sits under a vertical
 *  darken that keeps the top and bottom edges cooler than the middle band. */
const ATMOSPHERE_STYLE: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(ellipse 60% 48% at 47% 39%, rgba(217,74,58,0.13) 0%, rgba(199,167,108,0.05) 42%, transparent 72%)," +
    "linear-gradient(180deg, rgba(5,5,7,0.62) 0%, rgba(13,13,15,0) 30%, rgba(13,13,15,0) 64%, rgba(4,4,6,0.68) 100%)",
};

/** Archival texture, masked so it reads as emerging from the dark near the
 *  mark rather than a uniform wallpaper across the whole frame. */
const TEXTURE_MASK =
  "radial-gradient(circle at 47% 40%, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 42%, rgba(0,0,0,0) 78%)";

/** A single static grain pass — film-texture, not motion. */
const GRAIN_STYLE: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
  backgroundSize: "140px 140px",
};

export function CinematicIntro() {
  const pathname = usePathname();
  const mounted = useMounted();
  const [visible, setVisible] = useState(false);

  const isIntroActive = useUIStore((state) => state.isIntroActive);
  const closeIntro = useUIStore((state) => state.closeIntro);
  const playIntro = useUIStore((state) => state.playIntro);

  const containerRef = useRef<HTMLDivElement>(null);
  const textureRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const glowGoldRef = useRef<HTMLDivElement>(null);
  const markWrapRef = useRef<HTMLDivElement>(null);
  const ruleRef = useRef<HTMLSpanElement>(null);
  const tagRef = useRef<HTMLParagraphElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const estRef = useRef<HTMLSpanElement>(null);
  const spineRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);

  const entranceTl = useRef<gsap.core.Timeline | null>(null);
  const idleTweens = useRef<gsap.core.Tween[]>([]);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    markIntroSeen();
    closeIntro();
    entranceTl.current?.kill();
    idleTweens.current.forEach((t) => t.kill());
    idleTweens.current = [];

    if (containerRef.current) containerRef.current.style.pointerEvents = "none";
    const reduced = prefersReducedMotion();

    // A quick rack-defocus away mirrors the rack-focus arrival — the exit
    // is the entrance run backwards at higher speed, not an unrelated fade.
    gsap.timeline({
      defaults: { ease: "power2.in", duration: reduced ? 0.01 : 0.35 },
      onComplete: () => setVisible(false),
    })
      .to(containerRef.current, { opacity: 0 }, 0)
      .to(markWrapRef.current, { scale: reduced ? 1 : 1.045, filter: reduced ? "blur(0px)" : "blur(16px)" }, 0)
      .to(glowRef.current, { opacity: 0, duration: reduced ? 0.01 : 0.3 }, 0)
      .to(glowGoldRef.current, { opacity: 0, duration: reduced ? 0.01 : 0.28 }, 0);
  }, [closeIntro]);

  useEffect(() => {
    if (!mounted || pathname?.startsWith("/admin")) return;

    // Plays on a first landing on the home page, and whenever something asks
    // for it explicitly (the account page replays it after signing up, the
    // dev replay control below asks for it directly).
    const onHome = pathname === "/" || pathname === "";
    const shouldPlay = isIntroActive || (onHome && !hasSeenIntro());
    if (!shouldPlay) return;

    markIntroSeen();
    finishedRef.current = false;

    // Deferred a frame rather than set synchronously in the effect body, so
    // this doesn't trigger a cascading render on mount.
    const raf = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(finish, INTRO_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [mounted, pathname, isIntroActive, finish]);

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

      if (prefersReducedMotion()) {
        // Jump straight to the finished composition rather than clearing
        // GSAP's inline styles back to bare CSS — glowRef, glowGoldRef and
        // spineRef now rely on GSAP-owned xPercent/yPercent for centring
        // (see the note above), which a clearProps would strip along with
        // everything else, leaving them mispositioned for exactly the
        // users this branch exists for.
        gsap.set(textureRef.current, { opacity: 0.22 });
        gsap.set(glowRef.current, { opacity: 0.19, scale: 1, xPercent: -50, yPercent: -50, x: 0, y: 0 });
        gsap.set(glowGoldRef.current, { opacity: 0.13, scale: 1, xPercent: -50, yPercent: -50, x: 0, y: 0 });
        gsap.set(markWrapRef.current, { opacity: 1, scale: 1, y: 0, rotation: 0, filter: "blur(0px)" });
        gsap.set(ruleRef.current, { scaleX: 1, opacity: 1 });
        gsap.set([tagRef.current, subRef.current], { opacity: 1, y: 0, filter: "blur(0px)" });
        gsap.set(frameRef.current, { opacity: 1, scale: 1, y: 0 });
        gsap.set(estRef.current, { opacity: 1, y: 0 });
        gsap.set(spineRef.current, { opacity: 1, yPercent: -50, y: 0 });
        gsap.set(skipRef.current, { opacity: 1, y: 0 });
        return;
      }

      // ── Resting state ──────────────────────────────────────────────
      gsap.set(textureRef.current, { opacity: 0 });
      // xPercent/yPercent do the centring GSAP's own way — composes
      // correctly with the animated x/y below, unlike a CSS translate class.
      gsap.set(glowRef.current, { opacity: 0.03, scale: 0.86, xPercent: -50, yPercent: -50, x: -30, y: 24 });
      gsap.set(glowGoldRef.current, { opacity: 0.015, scale: 0.78, xPercent: -50, yPercent: -50, x: 22, y: -18 });
      gsap.set(markWrapRef.current, { opacity: 0.28, scale: 0.88, y: -32, rotation: -3, filter: "blur(20px)" });
      gsap.set(ruleRef.current, { scaleX: 0, opacity: 0 });
      gsap.set([tagRef.current, subRef.current], { opacity: 0, y: 16, filter: "blur(8px)" });
      gsap.set(frameRef.current, { opacity: 0, scale: 0.82, y: -28 });
      gsap.set(estRef.current, { opacity: 0, y: -10 });
      gsap.set(spineRef.current, { opacity: 0, yPercent: -50, y: 18 });
      gsap.set(skipRef.current, { opacity: 0, y: 6 });

      const tl = gsap.timeline({
        onComplete: () => {
          // Stage 6 — final ambient state: the mark, typography and frame
          // are all stable now. Only the two glows keep a slow breath —
          // opacity, scale, and a few px of drift — so the room feels alive
          // without anything repeating or pulsing.
          idleTweens.current = [
            gsap.to(glowRef.current, {
              opacity: 0.24,
              scale: 1.035,
              x: "+=6",
              y: "-=4",
              duration: 4.6,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1,
            }),
            gsap.to(glowGoldRef.current, {
              opacity: 0.17,
              scale: 1.02,
              x: "-=5",
              y: "+=4",
              duration: 5.6,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1,
              delay: 0.4,
            }),
          ];
        },
      });
      entranceTl.current = tl;

      tl
        // 1 — OPENING ATMOSPHERE: the room appears before anything in it
        // does. Texture leads; the two lights drift in from off-centre
        // (position, not just opacity/scale) a beat later.
        .to(textureRef.current, { opacity: 0.22, duration: 0.43, ease: "power2.out" }, 0)
        .to(glowRef.current, { opacity: 0.11, scale: 0.93, x: -10, y: 9, duration: 0.37, ease: "power2.out" }, 0.05)
        .to(glowGoldRef.current, { opacity: 0.06, scale: 0.88, x: 9, y: -8, duration: 0.31, ease: "power2.out" }, 0.09)

        // 2 — ANTICIPATION: the light finishes drifting into its resting
        // post and brightens well before the mark appears — the room is
        // visibly expecting something.
        .to(glowRef.current, { opacity: 0.3, scale: 1.04, x: 0, y: 0, duration: 0.28, ease: "power1.out" }, 0.43)
        .to(glowGoldRef.current, { opacity: 0.15, scale: 1.0, x: 0, y: 0, duration: 0.31, ease: "power1.out" }, 0.43)

        // 3 — LOGO REVEAL: one unified move — opacity, blur, scale,
        // position and rotation together, same duration, same easing — so
        // the still-soft, still-small, still-offset mark is actually seen
        // resolving rather than popping in and finishing off-screen of
        // perception. A true rack focus: it starts visible-but-unresolved,
        // not invisible.
        .to(
          markWrapRef.current,
          { opacity: 1, scale: 1, y: 0, rotation: 0, filter: "blur(0px)", duration: 0.71, ease: "power2.out" },
          0.71
        )
        // Light interacts with the reveal: both blooms keep climbing and
        // drifting a few px while the mark resolves, peaking as it lands.
        .to(glowRef.current, { opacity: 0.42, scale: 1.12, x: 5, y: -4, duration: 0.71, ease: "power2.out" }, 0.71)
        .to(glowGoldRef.current, { opacity: 0.23, scale: 1.06, x: -4, y: 3, duration: 0.68, ease: "power2.out" }, 0.74)

        // Controlled overshoot — a real, visible settle, not a cosmetic
        // wobble — then everything falls back to rest.
        .to(markWrapRef.current, { scale: 1.022, y: 4, rotation: 0.6, duration: 0.1, ease: "power1.out" }, 1.43)
        .to(markWrapRef.current, { scale: 1, y: 0, rotation: 0, duration: 0.2, ease: "power2.out" }, 1.53)
        .to(glowRef.current, { opacity: 0.19, scale: 1, x: 0, y: 0, duration: 0.37, ease: "power2.inOut" }, 1.43)
        .to(glowGoldRef.current, { opacity: 0.13, scale: 1, x: 0, y: 0, duration: 0.4, ease: "power2.inOut" }, 1.43)

        // 4 — GOLD RULE: draws left to right from a true edge — a line
        // being drawn, not a shape fading in.
        .to(ruleRef.current, { scaleX: 1, opacity: 1, duration: 0.38, ease: "power2.out" }, 1.8)

        // 4 — TAGLINES: staggered, each with its own blur-to-sharp arrival
        // so they read as arriving in sequence, not switching on together.
        .to(tagRef.current, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.34, ease: "power2.out" }, 1.93)
        .to(subRef.current, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.3, ease: "power2.out" }, 2.11)

        // 5 — ARCHIVAL FRAME: retracted and displaced well beyond the
        // logo's own move, arriving last and slowest so the hierarchy
        // reads front-to-back rather than everything landing together.
        .to(frameRef.current, { opacity: 1, scale: 1, y: 0, duration: 0.43, ease: "power2.out" }, 2.36)
        .to(estRef.current, { opacity: 1, y: 0, duration: 0.34, ease: "power2.out" }, 2.42)
        .to(spineRef.current, { opacity: 1, y: 0, duration: 0.34, ease: "power2.out" }, 2.48)
        .to(skipRef.current, { opacity: 1, y: 0, duration: 0.28, ease: "power2.out" }, 2.6);
    },
    { scope: containerRef, dependencies: [visible] }
  );

  return (
    <>
      {visible && (
        <div
          ref={containerRef}
          role="presentation"
          aria-hidden="true"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-ink select-none"
          style={ATMOSPHERE_STYLE}
        >
          {/* ── Backdrop ───────────────────────────────────────────────── */}

          {/* The same watermark texture used across the storefront, masked
              so it reads as emerging from the dark near the mark rather
              than a uniform wallpaper — and given its own slow, continuous
              pan (compositor-only transform) so it's never a still image. */}
          <div
            ref={textureRef}
            className="absolute inset-0 bg-japanese-pattern kairo-intro-drift-soft pointer-events-none"
            style={{ WebkitMaskImage: TEXTURE_MASK, maskImage: TEXTURE_MASK }}
          />

          {/* A single static grain pass for film-stock texture. */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay" style={GRAIN_STYLE} />

          {/* Two light sources, not one — a wider vermilion bloom and a
              smaller muted-gold bloom offset from it, each drifting in
              from off-centre rather than simply changing opacity in place.
              No CSS translate class here — GSAP owns the centring via
              xPercent/yPercent so the animated x/y compose correctly. */}
          <div
            ref={glowGoldRef}
            className="absolute left-[38%] top-[33%] w-[32vw] max-w-[320px] h-[24vw] max-h-[240px] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 50%, rgba(199,167,108,0.30) 0%, rgba(199,167,108,0.10) 45%, transparent 72%)",
              filter: "blur(46px)",
            }}
          />
          <div
            ref={glowRef}
            className="absolute left-[47%] top-[41%] w-[66vw] max-w-[700px] h-[42vw] max-h-[420px] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 50%, rgba(217,74,58,0.34) 0%, rgba(217,74,58,0.13) 38%, transparent 68%)",
              filter: "blur(62px)",
            }}
          />

          {/* Two drifting watermarks, reused from the site's own
              vocabulary rather than an invented pattern, balancing the
              composition left and right at different scales and speeds. */}
          <div className="absolute inset-0 pointer-events-none kairo-intro-drift-soft">
            <span
              className="absolute font-serif font-bold text-paper leading-none whitespace-nowrap"
              style={{ top: "15%", left: "9%", fontSize: "clamp(50px, 8vw, 120px)", opacity: 0.028 }}
            >
              幽玄
            </span>
          </div>
          <div className="absolute inset-0 pointer-events-none kairo-intro-drift">
            <span
              className="absolute font-serif font-bold text-paper leading-none whitespace-nowrap"
              style={{ top: "66%", left: "70%", fontSize: "clamp(70px, 11vw, 170px)", opacity: 0.035 }}
            >
              蒐集
            </span>
          </div>

          {/* Fixed vignette keeps the edges dark so the centre reads first. */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_43%,transparent_20%,rgba(13,13,15,0.86)_76%)]" />

          {/* Registration marks — the frame of an archival plate. Sized and
              spaced asymmetrically (a larger bottom margin than top, the
              way a print is mounted slightly above true centre) rather
              than four identical corners, with a restrained vermilion
              accent on the diagonal pair. */}
          <div ref={frameRef} className="absolute inset-0 pointer-events-none">
            <span className="absolute top-6 left-6 sm:top-10 sm:left-10 w-9 h-9 sm:w-11 sm:h-11 border-t border-l border-gold/32" />
            <span className="absolute top-6 left-6 sm:top-10 sm:left-10 w-[3px] h-[3px] rounded-full bg-vermilion/70" />

            <span className="absolute top-6 right-6 sm:top-10 sm:right-10 w-7 h-7 sm:w-8 sm:h-8 border-t border-r border-gold/18" />

            <span className="absolute bottom-9 left-6 sm:bottom-16 sm:left-10 w-7 h-7 sm:w-8 sm:h-8 border-b border-l border-gold/18" />

            <span className="absolute bottom-9 right-6 sm:bottom-16 sm:right-10 w-9 h-9 sm:w-11 sm:h-11 border-b border-r border-gold/32" />
            <span className="absolute bottom-9 right-6 sm:bottom-16 sm:right-10 w-[3px] h-[3px] -translate-x-full -translate-y-full rounded-full bg-vermilion/70" />
          </div>

          <span
            ref={estRef}
            className="absolute top-8 sm:top-12 left-1/2 -translate-x-1/2 font-mono text-[9px] tracking-[0.5em] uppercase text-gold/45"
          >
            Est. Cairo
          </span>

          {/* A single vertical line of type, set the way a spine is —
              re-centred on the light's own focal point, warmed up so it
              reads as archival marginalia, paired with a short editorial
              tick-rule beneath it. No CSS translate class — see the
              xPercent/yPercent note above; this element's own vertical
              centring was being silently overwritten by its GSAP y tween
              before this fix. */}
          <div
            ref={spineRef}
            className="absolute right-8 sm:right-11 top-[43%] flex flex-col items-center gap-3 pointer-events-none"
          >
            <span
              className="font-serif text-gold/35 leading-none"
              style={{
                writingMode: "vertical-rl",
                fontSize: "clamp(26px, 3.6vw, 46px)",
                letterSpacing: "0.3em",
              }}
            >
              物語の始まり
            </span>
            <span className="h-8 w-px bg-gradient-to-b from-gold/40 to-transparent" />
          </div>

          {/* ── The mark ───────────────────────────────────────────────── */}
          <div className="relative z-10 flex flex-col items-center px-6 text-center">
            <div ref={markWrapRef} className="relative">
              <Image
                src={storeMark}
                alt=""
                priority
                className="w-auto h-20 sm:h-28 md:h-32 drop-shadow-[0_0_30px_rgba(199,167,108,0.3)]"
              />
            </div>

            <span
              ref={ruleRef}
              className="origin-left mt-6 sm:mt-8 block h-px w-40 sm:w-56 bg-gradient-to-r from-transparent via-gold to-transparent"
            />

            <p ref={tagRef} className="mt-4 font-serif text-xs sm:text-sm tracking-[0.42em] uppercase text-gold/80">
              アニメヴァース
            </p>

            <p ref={subRef} className="mt-2 font-mono text-[9px] sm:text-[10px] tracking-[0.3em] uppercase text-text-muted">
              Manga &amp; Collector Editions
            </p>
          </div>

          {/* A quiet hint rather than a progress bar racing the animation. */}
          <button
            ref={skipRef}
            type="button"
            onClick={finish}
            className="absolute bottom-8 sm:bottom-10 font-mono text-[9px] sm:text-[10px] tracking-[0.28em] uppercase text-text-muted/70 hover:text-gold transition-colors cursor-pointer"
          >
            <span className="inline-flex items-center gap-3">
              <span className="h-px w-6 bg-gold/40" />
              Enter the archive
              <span className="h-px w-6 bg-gold/40" />
            </span>
          </button>
        </div>
      )}

      {/* Dev-only replay control. Renders regardless of `visible` so it's
          always reachable — no fighting cookies/localStorage/sessionStorage
          to see the sequence again while tuning it. Calls the same
          isIntroActive flag the account page's post-signup replay uses. */}
      {process.env.NODE_ENV !== "production" && (
        <button
          type="button"
          onClick={() => playIntro()}
          className="fixed bottom-3 left-3 z-[200] rounded-sm border border-gold/30 bg-ink/90 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-gold/70 backdrop-blur-sm transition-colors hover:border-gold/60 hover:text-gold cursor-pointer"
        >
          ⟲ Replay intro
        </button>
      )}
    </>
  );
}
