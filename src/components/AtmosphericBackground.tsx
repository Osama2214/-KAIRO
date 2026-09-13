"use client";

import React, { useEffect, useRef } from "react";
import { useMounted } from "@/store/useWishlistStore";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  maxOpacity: number;
  pulseSpeed: number;
  pulseOffset: number;
}

export function AtmosphericBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isClient = useMounted();

  // Floating Golden Dust Motes / Particles Canvas
  useEffect(() => {
    if (!isClient) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = Math.max(window.innerHeight, 900));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = Math.max(window.innerHeight, 900);
    };

    window.addEventListener("resize", handleResize, { passive: true });

    // Initialize 32 lightweight golden particles
    const particleCount = 32;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.8 + Math.random() * 1.6,
        speedY: 0.15 + Math.random() * 0.3,
        speedX: (Math.random() - 0.5) * 0.12,
        opacity: Math.random() * 0.35,
        maxOpacity: 0.2 + Math.random() * 0.3,
        pulseSpeed: 0.01 + Math.random() * 0.02,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.015;

      // Draw each particle
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Movement
        p.y -= p.speedY;
        p.x += p.speedX + Math.sin(time + p.pulseOffset) * 0.2;

        // Wrap around vertically
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        // Pulsing breathing opacity
        const dynamicOpacity = Math.max(
          0.04,
          p.maxOpacity * (0.5 + 0.5 * Math.sin(time * 1.5 + p.pulseOffset))
        );

        // Soft golden glow circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(199, 167, 108, ${dynamicOpacity})`;
        ctx.shadowColor = "rgba(199, 167, 108, 0.35)";
        ctx.shadowBlur = 3;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animFrame = requestAnimationFrame(render);
    };

    animFrame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", handleResize);
    };
  }, [isClient]);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 min-h-full pointer-events-none z-0 overflow-hidden select-none [container-type:size]"
    >
      {/* 1. Slow-Drifting Ambient Glowing Orbs */}
      {/* Vertical placement uses `translate` against the page height (cqh) rather
          than top/bottom percentages: the page grows while it loads, and moving
          a percentage-placed glow or kanji with it counted as a layout shift
          (over 1.0 CLS on a slow phone). A translate lands in the same place
          but is not a layout move. */}
      {/* Orb 1: Archival Gold Glowing Nebula (Top Left to Center) */}
      <div
        className="absolute top-0 [translate:0_-10cqh] -left-[10%] w-[600px] h-[600px] rounded-full opacity-35 blur-[130px] animate-orb-drift-1 pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(199, 167, 108, 0.20) 0%, rgba(199, 167, 108, 0.04) 55%, transparent 75%)",
        }}
      />

      {/* Orb 2: Japanese Vermilion Deep Glowing Nebula (Bottom Right to Center) */}
      <div
        className="absolute top-0 [translate:0_calc(95cqh_-_100%)] -right-[10%] w-[650px] h-[650px] rounded-full opacity-30 blur-[140px] animate-orb-drift-2 pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(217, 74, 58, 0.18) 0%, rgba(217, 74, 58, 0.03) 55%, transparent 80%)",
        }}
      />

      {/* Orb 3: Central Deep Amber Warmth Breathing Pulsar */}
      <div
        className="absolute top-0 [translate:0_40cqh] left-[30%] w-[450px] h-[450px] rounded-full opacity-25 blur-[120px] animate-orb-drift-3 pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(199, 167, 108, 0.14) 0%, rgba(217, 74, 58, 0.05) 50%, transparent 75%)",
        }}
      />

      {/* 2. Floating Golden Dust Motes / Particles Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
      />

      {/* 3. Giant Subtle Japanese Calligraphy Watermarks (Moving with the page) */}
      <div className="absolute top-0 [translate:0_12cqh] right-[5%] font-serif text-[180px] sm:text-[240px] font-bold text-white/[0.02] animate-kanji-float pointer-events-none leading-none select-none">
        蒐集
      </div>
      <div className="absolute top-0 [translate:0_calc(80cqh_-_100%)] left-[4%] font-serif text-[140px] sm:text-[190px] font-bold text-white/[0.015] animate-kanji-float-reverse pointer-events-none leading-none select-none">
        幽玄
      </div>

      {/* 4. Subtle Architectural Grid with Flowing Vignette */}
      <div className="absolute inset-0 bg-japanese-pattern opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-[circle_at_center,transparent_0%,rgba(13,13,15,0.7)_100%] pointer-events-none" />
    </div>
  );
}
