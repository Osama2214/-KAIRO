"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { SkipForward } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useMounted } from "@/store/useWishlistStore";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  twinkleSpeed: number;
}

function hasSeenIntro(): boolean {
  if (typeof window === "undefined") return true;
  // A full-screen animated takeover is exactly what reduced-motion asks us not
  // to play, so treat it as already seen.
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;
  } catch {}
  try {
    // 1. In-memory flag (survives client-side route navigation in same tab/window)
    if ((window as unknown as { __kairo_intro_seen?: boolean }).__kairo_intro_seen) return true;
    // 2. Cookie flag (shared across all tabs in incognito/private windows)
    if (document.cookie.split(";").some((c) => c.trim().startsWith("kairo_intro_seen=true"))) return true;
    // 3. LocalStorage flag (persistent across tabs in normal and most incognito windows)
    if (localStorage.getItem("kairo_intro_seen") === "true") return true;
    // 4. SessionStorage flag (per-tab fallback)
    if (sessionStorage.getItem("kairo_intro_seen") === "true") return true;
  } catch {
    // If incognito strictly blocks all storage access, default to true to avoid annoying looping intros
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

export function CinematicIntro() {
  const pathname = usePathname();
  const mounted = useMounted();
  const [shouldShow, setShouldShow] = useState(false);
  const [stage, setStage] = useState<"enter" | "active" | "exit">("enter");
  const [progress, setProgress] = useState(0);

  const isIntroActive = useUIStore((state) => state.isIntroActive);
  const closeIntro = useUIStore((state) => state.closeIntro);

  // Canvas & 3D Physics Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  // Tilt targets & smoothed values
  const targetRotX = useRef(6);
  const targetRotY = useRef(-14);
  const currentRotX = useRef(6);
  const currentRotY = useRef(-14);
  const animFrameId = useRef<number | null>(null);

  const finishIntro = useCallback(() => {
    markIntroSeen();
    setStage("exit");
    closeIntro();
    setTimeout(() => {
      setShouldShow(false);
    }, 650);
  }, [closeIntro]);

  const startIntro = useCallback(() => {
    markIntroSeen();
    const rafId = requestAnimationFrame(() => {
      setShouldShow(true);
      setStage("enter");
      setProgress(0);
    });

    // Sequence timing
    const stageTimer = setTimeout(() => {
      setStage("active");
    }, 150);

    // Auto-advance after 4.2 seconds
    const autoExitTimer = setTimeout(() => {
      finishIntro();
    }, 4200);

    // Progress Bar (0 to 100% in 4.0s)
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 2.2;
      });
    }, 90);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
        finishIntro();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(stageTimer);
      clearTimeout(autoExitTimer);
      clearInterval(interval);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [finishIntro]);

  useEffect(() => {
    // Only auto-trigger on the root landing page ("/") if never seen before.
    // If user is navigating other pages (/manga, /account, /checkout), do NOT auto-show.
    const isRootHome = pathname === "/";
    const alreadySeen = hasSeenIntro();
    const shouldTrigger = isIntroActive || (isRootHome && !alreadySeen);

    let cleanup: (() => void) | undefined;
    if (shouldTrigger) {
      cleanup = startIntro();
    } else {
      const raf = requestAnimationFrame(() => {
        setShouldShow(false);
      });
      cleanup = () => cancelAnimationFrame(raf);
    }

    return () => {
      if (cleanup) cleanup();
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [isIntroActive, startIntro, pathname]);

  // Golden Archival Particles Background Engine
  useEffect(() => {
    if (!shouldShow || stage === "exit") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Initialize 35 warm gold archival embers
    const particles: Particle[] = Array.from({ length: 35 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.8,
      speedY: Math.random() * 0.45 + 0.15,
      speedX: (Math.random() - 0.5) * 0.25,
      opacity: Math.random() * 0.5 + 0.2,
      twinkleSpeed: Math.random() * 0.02 + 0.008,
    }));

    let particleTime = 0;
    let particleAnimId: number;

    const renderParticles = () => {
      particleTime += 0.02;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y -= p.speedY;
        p.x += Math.sin(particleTime + p.y * 0.01) * 0.3 + p.speedX;
        p.opacity = 0.25 + Math.sin(particleTime * 2 + p.x) * 0.2;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(199, 167, 108, ${Math.max(0.05, p.opacity)})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(199, 167, 108, 0.4)";
        ctx.fill();
      });

      particleAnimId = requestAnimationFrame(renderParticles);
    };

    particleAnimId = requestAnimationFrame(renderParticles);

    return () => {
      cancelAnimationFrame(particleAnimId);
      window.removeEventListener("resize", handleResize);
    };
  }, [shouldShow, stage]);

  // Smooth 60-120fps LERP loop for 3D card physics & zero-gravity floating
  useEffect(() => {
    if (!shouldShow || stage === "exit") return;

    let time = 0;
    const updatePhysics = () => {
      time += 0.025;
      // Gentle natural zero-gravity wave
      const idleY = Math.sin(time) * 4.5;
      const idleX = Math.cos(time * 0.75) * 3;

      // Linear Interpolation
      currentRotX.current += (targetRotX.current + idleX - currentRotX.current) * 0.075;
      currentRotY.current += (targetRotY.current + idleY - currentRotY.current) * 0.075;

      if (cardRef.current) {
        cardRef.current.style.transform = `perspective(1400px) rotateX(${currentRotX.current}deg) rotateY(${currentRotY.current}deg) translateY(${Math.sin(time) * 7}px)`;
      }

      animFrameId.current = requestAnimationFrame(updatePhysics);
    };

    animFrameId.current = requestAnimationFrame(updatePhysics);

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [shouldShow, stage]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (stage === "exit") return;
    const { innerWidth, innerHeight } = window;
    const x = (e.clientX / innerWidth - 0.5) * 2; // -1 to 1
    const y = (e.clientY / innerHeight - 0.5) * 2; // -1 to 1

    // Dynamic 3D tilt
    targetRotY.current = x * 22;
    targetRotX.current = -y * 18;

    // Specular Glare Follow
    if (glareRef.current) {
      const glareX = (e.clientX / innerWidth) * 100;
      const glareY = (e.clientY / innerHeight) * 100;
      glareRef.current.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.22) 0%, rgba(199,167,108,0.12) 40%, transparent 68%)`;
    }
  };

  if (!mounted || !shouldShow) {
    return null;
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onClick={finishIntro}
      className={`fixed inset-0 z-50 bg-[#060608] flex flex-col items-center justify-center overflow-hidden transition-all duration-700 ease-out select-none cursor-pointer ${
        stage === "exit"
          ? "opacity-0 scale-105 pointer-events-none invisible"
          : "opacity-100 scale-100 visible"
      }`}
      style={{ willChange: "transform, opacity" }}
    >
      {/* Background Canvas: Golden Embers & Floating Archival Particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0 opacity-75"
      />

      {/* Atmospheric Volumetric Spotlights */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[850px] h-[550px] bg-gold/10 rounded-full blur-[150px] pointer-events-none animate-pulse-glow" />
      <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-vermilion/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Skip Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          finishIntro();
        }}
        className="absolute top-7 right-7 z-50 flex items-center gap-2 px-4 py-2 rounded-xs bg-ink-surface/90 border border-ink-border hover:border-gold text-paper/80 hover:text-paper transition-all text-xs font-mono tracking-widest uppercase cursor-pointer backdrop-blur-md group"
      >
        <span>SKIP</span>
        <span className="text-[10px] text-text-muted group-hover:text-gold">[ESC]</span>
        <SkipForward strokeWidth={1.5} className="w-3.5 h-3.5 text-gold group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* STAGE: 3D MANGA VOLUME & PARALLAX METADATA CHIPS */}
      <div className="relative z-10 flex flex-col items-center justify-center max-w-2xl w-full px-4">
        {/* 3D Perspective Viewport */}
        <div
          className="perspective-1000 flex items-center justify-center relative py-6"
          style={{ perspective: "1400px" }}
        >
          {/* Ambient Ground Shadow that breathes dynamically with the card */}
          <div className="absolute -bottom-5 w-56 sm:w-68 h-9 bg-black/85 rounded-full blur-xl transform scale-x-110 pointer-events-none transition-transform duration-300" />

          {/* THE 3D MANGA VOLUME / HERO CARD */}
          <div
            ref={cardRef}
            className={`relative w-64 h-92 sm:w-72 sm:h-[420px] preserve-3d transition-all duration-700 ease-out will-change-transform ${
              stage === "enter"
                ? "opacity-0 scale-75 -translate-y-14"
                : stage === "exit"
                ? "scale-120 translate-z-24 opacity-0"
                : "opacity-100 scale-100"
            }`}
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            {/* FRONT COVER — 100% Solid Opaque Deluxe Hardcover (Zero clutter, zero bleed-through) */}
            <div className="absolute inset-0 bg-[#121216] border border-gold/50 rounded-xs shadow-[0_30px_100px_rgba(0,0,0,0.98)] overflow-hidden flex flex-col justify-between p-4 bg-linear-to-b from-[#1c1c24] via-[#121216] to-[#0a0a0d]">
              
              {/* Header inside cover */}
              <div className="flex items-center justify-between border-b border-gold/30 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-vermilion rounded-xs flex items-center justify-center text-paper font-serif font-bold text-[10px] shadow-sm">
                    ANIMEVERSE
                  </div>
                  <span className="font-mono text-[9px] tracking-widest text-gold uppercase font-bold">
                    ANIMEVERSE ARCHIVE
                  </span>
                </div>
                <span className="text-[10px] font-mono text-paper-muted uppercase tracking-wider font-semibold">
                  VOL. 01
                </span>
              </div>

              {/* Artwork Box with Dynamic Diagonal Holographic Sweep */}
              <div className="relative my-auto w-full aspect-[3/4] max-h-[260px] sm:max-h-[280px] rounded-xs overflow-hidden border border-ink-border shadow-2xl mx-auto bg-black group-hover:border-gold/60 transition-colors">
                <img
                  src="https://dw9to29mmj727.cloudfront.net/products/1974710025.jpg"
                  alt="Jujutsu Kaisen Deluxe First Edition"
                  className="w-full h-full object-cover select-none pointer-events-none"
                  draggable={false}
                />

                {/* Shimmer / Holographic Gold Light Beam passing diagonally across cover */}
                <div className="absolute inset-0 -translate-x-full animate-shimmer-sweep bg-linear-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                {/* Collector's Japanese Stamp */}
                <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/90 backdrop-blur-sm border border-gold/40 rounded-xs text-[9px] font-serif text-gold tracking-widest shadow-md">
                  初版限定
                </div>
              </div>

              {/* Footer inside cover */}
              <div className="flex items-center justify-between border-t border-ink-border/80 pt-2 text-[9px] font-mono">
                <span className="text-paper font-bold uppercase tracking-wider font-sans">
                  JUJUTSU KAISEN
                </span>
                <span className="text-gold tracking-widest font-semibold">
                  DELUXE ARCHIVE
                </span>
              </div>

              {/* Dynamic Specular Mouse Glare Overlay */}
              <div
                ref={glareRef}
                className="absolute inset-0 pointer-events-none mix-blend-overlay transition-opacity duration-300"
                style={{
                  background:
                    "radial-gradient(circle at 40% 30%, rgba(255,255,255,0.22) 0%, rgba(199,167,108,0.12) 40%, transparent 68%)",
                }}
              />
            </div>

            {/* 3D BOOK SPINE — Left 3D Side with Gold Kanji */}
            <div
              className="absolute top-0 bottom-0 -left-5 w-5 bg-[#0e0e12] border-y border-l border-gold/40 origin-right flex flex-col justify-between items-center py-5 text-gold select-none pointer-events-none shadow-2xl"
              style={{ transform: "rotateY(-90deg)" }}
            >
              <span className="writing-mode-vertical font-serif text-[11px] tracking-widest text-gold font-bold">
                ANIMEVERSE
              </span>
              <span className="writing-mode-vertical font-sans text-[8px] font-extrabold text-paper tracking-wider">
                01
              </span>
              <span className="writing-mode-vertical font-mono text-[8px] text-text-muted">
                KRO
              </span>
            </div>

            {/* 3D Archival Paper Edges (Right side fanning depth) */}
            <div
              className="absolute top-1 bottom-1 -right-2 w-2 bg-[#E5DFD3] border-y border-r border-[#C8C0B0] origin-left select-none pointer-events-none shadow-md"
              style={{ transform: "rotateY(90deg)" }}
            />
          </div>
        </div>

        {/* ELEGANT, UNCLUTTERED BRANDING BELOW THE CARD (Strictly isolated, Zero Overlap!) */}
        <div className="mt-7 text-center flex flex-col items-center">
          <div className="flex items-center justify-center gap-3 mb-1.5">
            <span className="h-px w-10 bg-linear-to-r from-transparent to-gold/60" />
            <span className="font-serif text-gold text-xs sm:text-sm tracking-[0.45em] uppercase">
              物語と記憶のかたち
            </span>
            <span className="h-px w-10 bg-linear-to-l from-transparent to-gold/60" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[0.38em] uppercase text-paper font-sans">
            ANIMEVERSE
          </h1>

          <p className="mt-2 text-[10px] sm:text-[11px] font-mono tracking-[0.32em] text-text-muted uppercase">
            JAPANESE MANGA &amp; EDITORIAL ARCHIVE
          </p>
        </div>
      </div>

      {/* Bottom Gold Laser Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink-border/40">
        <div
          className="h-full bg-linear-to-r from-gold via-vermilion to-gold transition-all duration-100 ease-linear shadow-[0_0_12px_rgba(199,167,108,0.9)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}


