"use client";

import React, { useRef, useEffect } from "react";
import { KairoImage } from "@/components/KairoImage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShoppingBag, Eye } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ALL_VOLUMES } from "@/data/manga";
import { useCartStore } from "@/store/useCartStore";
import { useUIStore } from "@/store/useUIStore";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { formatPrice } from "@/lib/utils";
import { LiveEditButton } from "@/components/admin/LiveEditButton";
import { useTranslation } from "@/hooks/useTranslation";

export function TheCollection() {
  const router = useRouter();
  const { t, locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";
  const sectionRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const vol1Ref = useRef<HTMLDivElement>(null);
  const vol2Ref = useRef<HTMLDivElement>(null);
  const vol3Ref = useRef<HTMLDivElement>(null);
  const boxsetRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const kanjiBgRef = useRef<HTMLDivElement>(null);
  const auraRef = useRef<HTMLDivElement>(null);

  const addItem = useCartStore((state) => state.addItem);
  const { openCart, openReader } = useUIStore();
  const volumes = useStorefrontStore((state) => state.volumes);
  const collectionConfig = useStorefrontStore((state) => state.collectionConfig);

  const activeVolumes = volumes && volumes.length > 0 ? volumes : ALL_VOLUMES;

  const vol1 =
    (collectionConfig?.volumeId1 && activeVolumes.find((v) => v.id === collectionConfig.volumeId1)) ||
    activeVolumes.find((v) => v.id === "jjk-01") ||
    activeVolumes[0];
  const vol2 =
    (collectionConfig?.volumeId2 && activeVolumes.find((v) => v.id === collectionConfig.volumeId2)) ||
    activeVolumes.find((v) => v.id === "jjk-02") ||
    activeVolumes[1] ||
    activeVolumes[0];
  const vol3 =
    (collectionConfig?.volumeId3 && activeVolumes.find((v) => v.id === collectionConfig.volumeId3)) ||
    activeVolumes.find((v) => v.id === "jjk-03") ||
    activeVolumes[2] ||
    activeVolumes[0];

  const bundlePrice = collectionConfig?.price ?? 29.99;

  const isBundleAvailable = (vol1?.stock ?? 0) > 0 && (vol2?.stock ?? 0) > 0 && (vol3?.stock ?? 0) > 0;

  const handleAddBundle = () => {
    if (!isBundleAvailable) return;
    if (vol1 && vol1.stock > 0) addItem(vol1, 1);
    if (vol2 && vol2.stock > 0) addItem(vol2, 1);
    if (vol3 && vol3.stock > 0) addItem(vol3, 1);
    openCart();
  };

  const formatCollectionTitle = (title: string) => {
    if (/ and /i.test(title)) {
      const parts = title.split(/ and /i);
      return (
        <>
          <span>{parts[0]} &amp;</span>
          <span className="block">{parts.slice(1).join(" & ")}</span>
        </>
      );
    }
    if (title.includes(" & ")) {
      const parts = title.split(" & ");
      return (
        <>
          <span>{parts[0]} &amp;</span>
          <span className="block">{parts.slice(1).join(" & ")}</span>
        </>
      );
    }
    return title;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    const onLenisScroll = () => {
      ScrollTrigger.update();
    };

    if (window.__lenis) {
      window.__lenis.on("scroll", onLenisScroll);
    }

    const mm = gsap.matchMedia();

    // ==========================================
    // 1. WIDESCREEN & DESKTOP (min-width: 1025px)
    // Book: w-52 h-76 (208px x 304px). Spacing: 224px (16px gap, 0 overlap)
    // Box: w-740px h-410px (53px top/bottom clearance, 0 collision)
    // ==========================================
    mm.add("(min-width: 1025px)", () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.65, // Buttery smooth physical scrub
        },
      });

      // Initial State: Deep 3D Parallax Fan-out Presentation
      gsap.set(vol1Ref.current, {
        x: -420,
        y: 30,
        z: 60,
        rotationY: -32,
        rotationZ: -8,
        rotationX: 10,
        scale: 0.95,
        opacity: 1,
        force3D: true,
      });

      gsap.set(vol2Ref.current, {
        x: 0,
        y: -38,
        z: 130,
        rotationY: 0,
        rotationZ: 0,
        rotationX: -8,
        scale: 1.1,
        opacity: 1,
        force3D: true,
      });

      gsap.set(vol3Ref.current, {
        x: 420,
        y: 30,
        z: 60,
        rotationY: 32,
        rotationZ: 8,
        rotationX: 10,
        scale: 0.95,
        opacity: 1,
        force3D: true,
      });

      gsap.set(boxsetRef.current, {
        scale: 1.22,
        opacity: 0,
        z: -80,
        rotationX: 14,
        force3D: true,
      });

      gsap.set(stageRef.current, {
        rotationX: 0,
        rotationY: 0,
        z: 0,
        force3D: true,
      });

      gsap.set(auraRef.current, {
        opacity: 0,
        scale: 0.7,
      });

      gsap.set(kanjiBgRef.current, {
        scale: 1,
        opacity: 0.025,
      });

      gsap.set(ctaRef.current, {
        opacity: 0,
        y: 24,
        pointerEvents: "none",
      });

      // Stage 1a: Dynamic 3D Fan Float & Spine Exhibition Parallax (0 -> 1.2s)
      tl.to(
        vol1Ref.current,
        {
          x: -460,
          y: 42,
          z: 85,
          rotationY: -38,
          rotationZ: -9,
          rotationX: 14,
          scale: 0.96,
          duration: 1.2,
          ease: "power2.out",
          force3D: true,
        },
        0
      )
        .to(
          vol2Ref.current,
          {
            x: 0,
            y: -52,
            z: 165,
            rotationY: 0,
            rotationZ: 0,
            rotationX: -12,
            scale: 1.14,
            duration: 1.2,
            ease: "power2.out",
            force3D: true,
          },
          0
        )
        .to(
          vol3Ref.current,
          {
            x: 460,
            y: 42,
            z: 85,
            rotationY: 38,
            rotationZ: 9,
            rotationX: 14,
            scale: 0.96,
            duration: 1.2,
            ease: "power2.out",
            force3D: true,
          },
          0
        )

        // Stage 1b: Books Glide, Untilt & Align into Uniform Docking Row (1.2 -> 3.2s)
        .to(
          vol1Ref.current,
          {
            x: -258,
            y: 0,
            z: 20,
            rotationY: 0,
            rotationZ: 0,
            rotationX: 0,
            scale: 1,
            duration: 2.0,
            ease: "power2.inOut",
            force3D: true,
          },
          1.2
        )
        .to(
          vol2Ref.current,
          {
            x: 0,
            y: 0,
            z: 20,
            rotationY: 0,
            rotationZ: 0,
            rotationX: 0,
            scale: 1,
            duration: 2.0,
            ease: "power2.inOut",
            force3D: true,
          },
          1.2
        )
        .to(
          vol3Ref.current,
          {
            x: 258,
            y: 0,
            z: 20,
            rotationY: 0,
            rotationZ: 0,
            rotationX: 0,
            scale: 1,
            duration: 2.0,
            ease: "power2.inOut",
            force3D: true,
          },
          1.2
        )
        .to(
          kanjiBgRef.current,
          {
            scale: 1.15,
            opacity: 0.05,
            duration: 2.5,
            ease: "power1.out",
          },
          1.0
        )

        // Stage 2: Archival Deluxe Slipcase Locks In Behind Volumes (2.2 -> 4.0s)
        .to(
          boxsetRef.current,
          {
            scale: 1,
            opacity: 1,
            z: -25,
            rotationX: 0,
            duration: 1.8,
            ease: "back.out(1.2)",
            force3D: true,
          },
          2.2
        )

        // Stage 3: Ambient Golden Aura Flash & Illumination (2.6 -> 4.4s)
        .to(
          auraRef.current,
          {
            opacity: 0.42,
            scale: 1.12,
            duration: 1.8,
            ease: "power2.out",
          },
          2.6
        )

        // Stage 4: Cinematic 3D Studio Showcase Tilt (3.3 -> 5.0s)
        .to(
          stageRef.current,
          {
            rotationX: 6,
            rotationY: -4,
            z: 32,
            duration: 1.7,
            ease: "power2.out",
            force3D: true,
          },
          3.3
        )

        // Stage 5: Reveal Purchase Climax CTA (3.7 -> 5.2s)
        .to(
          ctaRef.current,
          {
            opacity: 1,
            y: 0,
            pointerEvents: "auto",
            duration: 1.5,
            ease: "power3.out",
          },
          3.7
        );
    });

    // ==========================================
    // 2. LAPTOP & TABLET (641px - 1024px)
    // Book: w-44 h-64 (176px x 256px). Spacing: 190px (14px gap)
    // Box: w-620px h-350px (47px top/bottom clearance)
    // ==========================================
    mm.add("(min-width: 641px) and (max-width: 1024px)", () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.65,
        },
      });

      gsap.set(vol1Ref.current, {
        x: -330,
        y: 24,
        z: 45,
        rotationY: -26,
        rotationZ: -6,
        rotationX: 8,
        scale: 0.95,
        opacity: 1,
        force3D: true,
      });

      gsap.set(vol2Ref.current, {
        x: 0,
        y: -30,
        z: 100,
        rotationY: 0,
        rotationZ: 0,
        rotationX: -6,
        scale: 1.08,
        opacity: 1,
        force3D: true,
      });

      gsap.set(vol3Ref.current, {
        x: 330,
        y: 24,
        z: 45,
        rotationY: 26,
        rotationZ: 6,
        rotationX: 8,
        scale: 0.95,
        opacity: 1,
        force3D: true,
      });

      gsap.set(boxsetRef.current, {
        scale: 1.18,
        opacity: 0,
        z: -65,
        rotationX: 12,
        force3D: true,
      });

      gsap.set(stageRef.current, {
        rotationX: 0,
        rotationY: 0,
        z: 0,
        force3D: true,
      });

      gsap.set(auraRef.current, {
        opacity: 0,
        scale: 0.7,
      });

      gsap.set(ctaRef.current, {
        opacity: 0,
        y: 20,
        pointerEvents: "none",
      });

      // Stage 1a: Tablet 3D Fan Float (0 -> 1.2s)
      tl.to(
        vol1Ref.current,
        {
          x: -360,
          y: 32,
          z: 65,
          rotationY: -30,
          rotationZ: -7,
          rotationX: 10,
          scale: 0.96,
          duration: 1.2,
          ease: "power2.out",
          force3D: true,
        },
        0
      )
        .to(
          vol2Ref.current,
          {
            x: 0,
            y: -40,
            z: 125,
            rotationY: 0,
            rotationZ: 0,
            rotationX: -9,
            scale: 1.12,
            duration: 1.2,
            ease: "power2.out",
            force3D: true,
          },
          0
        )
        .to(
          vol3Ref.current,
          {
            x: 360,
            y: 32,
            z: 65,
            rotationY: 30,
            rotationZ: 7,
            rotationX: 10,
            scale: 0.96,
            duration: 1.2,
            ease: "power2.out",
            force3D: true,
          },
          0
        )

        // Stage 1b: Align into Docking Row (1.2 -> 3.2s)
        .to(
          vol1Ref.current,
          {
            x: -210,
            y: 0,
            z: 15,
            rotationY: 0,
            rotationZ: 0,
            rotationX: 0,
            scale: 1,
            duration: 2.0,
            ease: "power2.inOut",
            force3D: true,
          },
          1.2
        )
        .to(
          vol2Ref.current,
          {
            x: 0,
            y: 0,
            z: 15,
            rotationY: 0,
            rotationZ: 0,
            rotationX: 0,
            scale: 1,
            duration: 2.0,
            ease: "power2.inOut",
            force3D: true,
          },
          1.2
        )
        .to(
          vol3Ref.current,
          {
            x: 210,
            y: 0,
            z: 15,
            rotationY: 0,
            rotationZ: 0,
            rotationX: 0,
            scale: 1,
            duration: 2.0,
            ease: "power2.inOut",
            force3D: true,
          },
          1.2
        )

        // Stage 2: Slipcase Locks In (2.2 -> 4.0s)
        .to(
          boxsetRef.current,
          {
            scale: 1,
            opacity: 1,
            z: -20,
            rotationX: 0,
            duration: 1.8,
            ease: "back.out(1.2)",
            force3D: true,
          },
          2.2
        )

        // Stage 3: Aura Glow (2.6 -> 4.4s)
        .to(
          auraRef.current,
          {
            opacity: 0.38,
            scale: 1.05,
            duration: 1.8,
            ease: "power2.out",
          },
          2.6
        )

        // Stage 4: Showcase Tilt (3.3 -> 5.0s)
        .to(
          stageRef.current,
          {
            rotationX: 5,
            rotationY: -3,
            z: 20,
            duration: 1.7,
            ease: "power2.out",
            force3D: true,
          },
          3.3
        )

        // Stage 5: Climax CTA (3.7 -> 5.2s)
        .to(
          ctaRef.current,
          {
            opacity: 1,
            y: 0,
            pointerEvents: "auto",
            duration: 1.5,
            ease: "power3.out",
          },
          3.7
        );
    });

    // ==========================================
    // 3. MOBILE (max-width: 640px) - compact, low-compositing vertical stack.
    // ==========================================
    mm.add("(max-width: 640px)", () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.65,
        },
      });

      // Initial State: 3D vertical fan-out parallax float
      gsap.set(vol1Ref.current, {
        x: 0,
        y: -120,
        scale: 0.98,
        opacity: 1,
        force3D: true,
      });

      gsap.set(vol2Ref.current, {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        force3D: true,
      });

      gsap.set(vol3Ref.current, {
        x: 0,
        y: 120,
        scale: 0.98,
        opacity: 1,
        force3D: true,
      });

      gsap.set(boxsetRef.current, {
        scale: 1.02,
        opacity: 0,
      });

      gsap.set(stageRef.current, {
        rotationX: 0,
        rotationY: 0,
        z: 0,
        force3D: true,
      });

      gsap.set(auraRef.current, {
        opacity: 0,
        scale: 0.7,
      });

      gsap.set(ctaRef.current, {
        opacity: 0,
        y: 18,
        pointerEvents: "none",
      });

      // Stage 1a: small vertical motion only; this stays responsive on mobile GPUs.
      tl.to(
        vol1Ref.current,
        {
          x: 0,
          y: -135,
          scale: 1,
          duration: 1.2,
          ease: "power2.out",
          force3D: true,
        },
        0
      )
        .to(
          vol2Ref.current,
          {
            x: 0,
            y: 0,
            duration: 1.2,
            ease: "power2.out",
            force3D: true,
          },
          0
        )
        .to(
          vol3Ref.current,
          {
            x: 0,
            y: 135,
            scale: 1,
            duration: 1.2,
            ease: "power2.out",
            force3D: true,
          },
          0
        )

        // Stage 1b: Align into Vertical Docking Stack (1.2 -> 3.2s)
        .to(
          vol1Ref.current,
          {
            x: 0,
            y: -113,
            scale: 1,
            duration: 2.0,
            ease: "power2.inOut",
            force3D: true,
          },
          1.2
        )
        .to(
          vol2Ref.current,
          {
            x: 0,
            y: 0,
            scale: 1,
            duration: 2.0,
            ease: "power2.inOut",
            force3D: true,
          },
          1.2
        )
        .to(
          vol3Ref.current,
          {
            x: 0,
            y: 113,
            scale: 1,
            duration: 2.0,
            ease: "power2.inOut",
            force3D: true,
          },
          1.2
        )

        // Stage 2: Vertical Slipcase Locks In (2.2 -> 4.0s)
        .to(
          boxsetRef.current,
          {
            scale: 1,
            opacity: 1,
            duration: 1.8,
            ease: "back.out(1.15)",
            force3D: true,
          },
          2.2
        )

        // Stage 3: Aura Glow (2.6 -> 4.4s)
        .to(
          auraRef.current,
          {
            opacity: 0.32,
            scale: 1.0,
            duration: 1.8,
            ease: "power2.out",
          },
          2.6
        )

        // Stage 4: Showcase 3D Tilt (3.3 -> 5.0s)
        .to(
          stageRef.current,
          {
            rotationX: 3.5,
            rotationY: -1.5,
            z: 12,
            duration: 1.7,
            ease: "power2.out",
            force3D: true,
          },
          3.3
        )

        // Stage 5: Climax CTA (3.7 -> 5.2s)
        .to(
          ctaRef.current,
          {
            opacity: 1,
            y: 0,
            pointerEvents: "auto",
            duration: 1.5,
            ease: "power3.out",
          },
          3.7
        );
    });

    ScrollTrigger.refresh();
    window.__lenis?.resize();

    return () => {
      if (window.__lenis) {
        window.__lenis.off("scroll", onLenisScroll);
      }
      mm.revert();
      ScrollTrigger.refresh();
      window.__lenis?.resize();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="the-collection"
      className="relative w-full h-[170vh] sm:h-[200vh] bg-ink border-t border-ink-border/60 overflow-clip select-none"
    >
      {/* Sticky Inner Viewport */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col items-center justify-between pt-16 xs:pt-20 sm:pt-20 lg:pt-24 pb-5 xs:pb-7 sm:pb-10 px-2 sm:px-6">
        {/* Atmospheric Subtle Japanese Typographic Watermark Background */}
        <div
          ref={kanjiBgRef}
          className="absolute inset-0 hidden sm:flex items-center justify-center pointer-events-none select-none transition-transform will-change-transform z-0"
        >
          <span className="text-[260px] sm:text-[380px] lg:text-[440px] font-serif font-black text-paper/5 tracking-[0.15em] blur-[1px]">
            全巻
          </span>
        </div>

        {/* Ambient Warm Golden Aura Glow during Assembly - Softened & Atmospheric */}
        <div
          ref={auraRef}
          className="absolute top-1/2 left-1/2 hidden sm:block -translate-x-1/2 -translate-y-1/2 w-[700px] lg:w-[850px] h-[400px] lg:h-[480px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(199,167,108,0.12)_0%,rgba(199,167,108,0.02)_55%,transparent_75%)] blur-3xl pointer-events-none z-0 will-change-transform"
        />

        {/* 01 — Top Editorial Header */}
        <div className="text-center z-10 pt-2 xs:pt-4 sm:pt-6 flex flex-col items-center gap-1.5 sm:gap-2">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight uppercase text-paper font-cinzel">
            {isArabic ? t.theCollection.headline : (collectionConfig?.headline || "THE COLLECTION")}
          </h2>
          {/* Authentic Editorial Subtitle & Japanese Accent rule matching mockup */}
          <div className="flex items-center gap-2.5 my-0.5">
            <span className="h-px w-6 sm:w-10 bg-gold/40" />
            <span className="text-[10px] sm:text-xs font-serif text-vermilion tracking-[0.25em]">コレクション</span>
            <span className="h-px w-6 sm:w-10 bg-gold/40" />
          </div>
          <p className="text-[11px] sm:text-sm text-paper-muted/80 max-w-sm sm:max-w-md font-light leading-relaxed px-4 hidden xs:block">
            {isArabic ? "قصص كاملة. مجموعات حصرية فاخرة. رحلة أعمق إلى عوالم تأسر خيالك." : "Complete stories. Premium boxsets. A deeper journey into the worlds that move you."}
          </p>
          <LiveEditButton target={{ type: "collection" }} label="Edit Collection" variant="floating" size="xs" />
        </div>

        {/* 02 — Center 3D Stage (Vertical Stacking on Mobile, Horizontal on Desktop) */}
        <div
          ref={stageRef}
          className="relative w-full max-w-6xl h-[440px] xs:h-[460px] sm:h-96 lg:h-[500px] flex items-center justify-center perspective-2000 preserve-3d my-auto transform-gpu"
        >
          {/* Slipcase Housing Box (Vertical portrait slipcase on mobile, landscape on desktop) */}
          <div
            ref={boxsetRef}
            className="absolute w-[calc(100%-16px)] xs:w-[calc(100%-20px)] sm:w-[700px] lg:w-[860px] h-[420px] xs:h-[450px] sm:h-[390px] lg:h-[480px] rounded-xs border border-gold/40 bg-linear-to-b from-ink-surface/90 via-ink to-ink-surface/90 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4 lg:p-5 z-10 shadow-[0_0_40px_rgba(199,167,108,0.08)] sm:shadow-[0_0_70px_rgba(199,167,108,0.10)] transform-gpu [will-change:auto] sm:will-change-transform [backface-visibility:hidden] overflow-hidden"
          >
            {/* Background Japanese Watermark Texture inside Slipcase */}
            <div className="absolute inset-0 bg-japanese-pattern opacity-15 sm:opacity-35 pointer-events-none" />

            {/* Delicate Corner Foil Accents */}
            <div className="absolute top-2.5 left-2.5 w-2.5 h-2.5 border-t border-l border-gold/60" />
            <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 border-t border-r border-gold/60" />
            <div className="absolute bottom-2.5 left-2.5 w-2.5 h-2.5 border-b border-l border-gold/60" />
            <div className="absolute bottom-2.5 right-2.5 w-2.5 h-2.5 border-b border-r border-gold/60" />

            {/* Top Bar of Slipcase - Calm & Refined */}
            <div className="flex items-center justify-between border-b border-gold/15 pb-2 px-1 relative z-10">
              <span className="text-[9px] sm:text-[10px] font-mono tracking-[0.22em] text-gold/80 uppercase font-medium">
                {isArabic ? "صندوق أرشيف كايرو // الإصدار 01" : "KAIRO ARCHIVE BOXSET // SERIES"}
              </span>
              <span className="text-[8px] sm:text-[9px] font-mono text-paper-muted/50 tracking-widest uppercase font-light">
                {isArabic ? "طبعة أولى • 2026" : "FIRST PRINT EDITION"}
              </span>
            </div>

            {/* Inner background decorative kanji */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.025] z-0">
              <span className="text-9xl font-serif text-gold font-bold">回路</span>
            </div>

            {/* Bottom Bar of Slipcase - Calm & Refined */}
            <div className="flex items-center justify-between border-t border-gold/15 pt-2 px-1 relative z-10">
              <span className="text-[9px] sm:text-[10px] font-serif text-paper-muted/60 tracking-wider">
                呪術廻戦 完全書架
              </span>
              <span className="text-[8px] sm:text-[9px] font-mono text-gold/70 tracking-[0.22em] uppercase font-medium">
                {isArabic ? "صندوق حفظ فاخر" : "DELUXE ARCHIVAL SLIPCASE"}
              </span>
            </div>
          </div>

          {/* Volume 01 (Top on mobile, Left on desktop) */}
          <div
            ref={vol1Ref}
            onClick={() => router.push(`/manga/${vol1.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/manga/${vol1.id}`);
              }
            }}
            className="absolute w-[calc(100%-36px)] xs:w-[calc(100%-44px)] sm:w-48 lg:w-60 h-[104px] xs:h-[112px] sm:h-70 lg:h-88 rounded-xs overflow-hidden border border-ink-border/90 shadow-[0_12px_28px_rgba(0,0,0,0.72)] sm:shadow-[0_20px_50px_rgba(0,0,0,0.85)] bg-[#0a0a0d] cursor-pointer group hover:border-gold hover:shadow-[0_25px_60px_rgba(199,167,108,0.3)] transition-[border-color,box-shadow] duration-300 z-20 select-none transform-gpu [will-change:auto] sm:will-change-transform [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [isolation:isolate]"
          >
            {/* MOBILE LAYOUT (< sm): Clean Horizontal Ticket without Eye Icon */}
            <div className="flex sm:hidden w-full h-full relative items-center justify-between overflow-hidden bg-[#0a0a0d] rtl:flex-row-reverse">
              {/* Top-Left Corner Subtle Faded Edge Wear */}
              <div className="absolute top-0 left-0 w-7 h-5 pointer-events-none z-25 bg-[radial-gradient(ellipse_at_0%_0%,rgba(180,174,162,0.10)_0%,rgba(180,174,162,0.03)_35%,transparent_70%)]" />

              {/* Top-Center Subtle Edge Wear */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-9 h-1.5 pointer-events-none z-25 bg-[radial-gradient(ellipse_at_50%_0%,rgba(180,174,162,0.09)_0%,rgba(180,174,162,0.02)_40%,transparent_75%)]" />

              {/* Bottom Edge Subtle Faded Wear (Shifted slightly left of center) */}
              <div className="absolute bottom-0 left-[36%] -translate-x-1/2 w-9 h-1.5 pointer-events-none z-25 bg-[radial-gradient(ellipse_at_50%_100%,rgba(180,174,162,0.09)_0%,rgba(180,174,162,0.02)_40%,transparent_75%)]" />

              {/* Left Details */}
              <div className="relative z-20 flex flex-col justify-center pl-4.5 pr-2 py-3 rtl:pr-4.5 rtl:pl-2 max-w-[62%] xs:max-w-[64%]">
                <span className="inline-block self-start px-2 py-0.5 rounded-xs bg-ink/80 sm:backdrop-blur-md text-[9px] xs:text-[10px] font-mono tracking-wider text-gold/90 border border-gold/20 font-semibold mb-1">
                  {vol1.volumeNumber ? `${isArabic ? "المجلد" : "VOL."} ${String(vol1.volumeNumber).padStart(2, "0")}` : (isArabic ? "المجلد 01" : "VOL. 01")}
                </span>
                <span className="text-[11px] xs:text-[13.5px] font-bold text-paper line-clamp-2 uppercase tracking-wide font-cinzel leading-tight">
                  {formatCollectionTitle(vol1.title)}
                </span>
                <span className="text-[9px] xs:text-[10px] font-mono text-paper-muted/60 tracking-widest uppercase mt-1">
                  {isArabic ? "طبعة أولى" : "FIRST PRINT"}
                </span>
              </div>

              {/* Right Art (Deep bleed across with wide smoky feather fade) */}
              <div className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 w-[55%] xs:w-[58%] h-full overflow-hidden pointer-events-none z-10">
                <KairoImage
                  src={vol1.coverImage}
                  alt={vol1.title}
                  sizes="(max-width: 639px) 55vw, 0px"
                  className="w-full h-full object-cover object-[center_20%] pointer-events-none group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-linear-to-r rtl:bg-linear-to-l from-[#0a0a0d] via-[#0a0a0d]/85 25%, via-[#0a0a0d]/45 60%, to-transparent pointer-events-none z-10" />
                <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0d]/85 via-transparent to-[#0a0a0d]/35 pointer-events-none z-10" />
                <div className="absolute top-2 right-2 rtl:right-auto rtl:left-2 pointer-events-none z-20 opacity-85 group-hover:opacity-100 transition-opacity">
                  <span className="text-[8px] font-serif text-vermilion font-bold tracking-wider px-1 py-0.5 rounded-xs bg-ink/80 border border-vermilion/40 backdrop-blur-xs">
                    回路
                  </span>
                </div>
              </div>
            </div>

            {/* DESKTOP / TABLET LAYOUT (sm+): Full Portrait Cover */}
            <div className="hidden sm:block w-full h-full relative">
              <KairoImage
                src={vol1.coverImage}
                alt={vol1.title}
                sizes="(max-width: 639px) 0px, 33vw"
                className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-700 ease-out transform-gpu [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
              />
              {/* Book spine curvature lighting */}
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-linear-to-r from-white/30 via-white/10 to-transparent pointer-events-none z-20" />
              <div className="absolute inset-0 bg-linear-to-t from-ink/30 via-transparent to-black/20 pointer-events-none" />

              {/* Volume Badge */}
              <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-20 pointer-events-none">
                <span className="px-2 py-0.5 rounded-xs bg-ink/80 backdrop-blur-md text-[8px] sm:text-[9px] font-mono tracking-wider text-gold/90 border border-gold/20 shadow-xs font-semibold">
                  {vol1.volumeNumber ? `${isArabic ? "المجلد" : "VOL."} ${String(vol1.volumeNumber).padStart(2, "0")}` : (isArabic ? "المجلد 01" : "VOL. 01")}
                </span>
                {vol1.stock <= 0 && (
                  <span className="px-2 py-0.5 rounded-xs bg-red-950/90 border border-red-800/80 text-[7px] sm:text-[8px] font-mono tracking-wider text-red-400 font-bold uppercase">
                    {isArabic ? "نفد" : "OUT OF STOCK"}
                  </span>
                )}
              </div>

              {/* Quick Preview Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openReader(vol1);
                }}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-xs bg-ink/85 backdrop-blur-md border border-ink-border text-paper hover:text-gold hover:border-gold transition-colors opacity-80 sm:opacity-0 sm:group-hover:opacity-100 z-30 shadow-md active:scale-90"
                title={isArabic ? "معاينة المجلد" : "Preview Volume"}
              >
                <Eye strokeWidth={1.5} className="w-3.5 h-3.5" />
              </button>

              {/* Bottom Title Bar */}
              <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3 bg-linear-to-t from-ink via-ink/95 to-transparent opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                <span className="text-[9px] sm:text-[11px] font-bold text-paper line-clamp-1 uppercase tracking-wider block">
                  {vol1.volumeNumber ? `${isArabic ? "المجلد" : "VOL."} ${String(vol1.volumeNumber).padStart(2, "0")} // ${vol1.title}` : vol1.title}
                </span>
                <span className="text-[8px] font-mono text-gold tracking-widest uppercase block mt-0.5 opacity-90">
                  {isArabic ? "طبعة أولى" : "FIRST PRINT"}
                </span>
              </div>
            </div>
          </div>

          {/* Volume 02 (Center) */}
          <div
            ref={vol2Ref}
            onClick={() => router.push(`/manga/${vol2.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/manga/${vol2.id}`);
              }
            }}
            className="absolute w-[calc(100%-36px)] xs:w-[calc(100%-44px)] sm:w-48 lg:w-60 h-[104px] xs:h-[112px] sm:h-70 lg:h-88 rounded-xs overflow-hidden border border-ink-border/90 shadow-[0_12px_28px_rgba(0,0,0,0.72)] sm:shadow-[0_20px_50px_rgba(0,0,0,0.85)] bg-[#0a0a0d] cursor-pointer group hover:border-gold hover:shadow-[0_25px_60px_rgba(199,167,108,0.3)] transition-[border-color,box-shadow] duration-300 z-20 select-none transform-gpu [will-change:auto] sm:will-change-transform [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [isolation:isolate]"
          >
            {/* MOBILE LAYOUT (< sm): Clean Horizontal Ticket without Eye Icon */}
            <div className="flex sm:hidden w-full h-full relative items-center justify-between overflow-hidden bg-[#0a0a0d] rtl:flex-row-reverse">
              {/* Top-Left Corner Subtle Faded Edge Wear */}
              <div className="absolute top-0 left-0 w-7 h-5 pointer-events-none z-25 bg-[radial-gradient(ellipse_at_0%_0%,rgba(180,174,162,0.10)_0%,rgba(180,174,162,0.03)_35%,transparent_70%)]" />

              {/* Top Edge Subtle Wear */}
              <div className="absolute top-0 left-[42%] -translate-x-1/2 w-9 h-1.5 pointer-events-none z-25 bg-[radial-gradient(ellipse_at_50%_0%,rgba(180,174,162,0.09)_0%,rgba(180,174,162,0.02)_40%,transparent_75%)]" />

              {/* Bottom Edge Subtle Wear (Shifted slightly left of center) */}
              <div className="absolute bottom-0 left-[36%] -translate-x-1/2 w-9 h-1.5 pointer-events-none z-25 bg-[radial-gradient(ellipse_at_50%_100%,rgba(180,174,162,0.09)_0%,rgba(180,174,162,0.02)_40%,transparent_75%)]" />

              {/* Left Details */}
              <div className="relative z-20 flex flex-col justify-center pl-4.5 pr-2 py-3 rtl:pr-4.5 rtl:pl-2 max-w-[62%] xs:max-w-[64%]">
                <span className="inline-block self-start px-2 py-0.5 rounded-xs bg-ink/80 sm:backdrop-blur-md text-[9px] xs:text-[10px] font-mono tracking-wider text-gold/90 border border-gold/20 font-semibold mb-1">
                  {vol2.volumeNumber ? `${isArabic ? "المجلد" : "VOL."} ${String(vol2.volumeNumber).padStart(2, "0")}` : (isArabic ? "المجلد 02" : "VOL. 02")}
                </span>
                <span className="text-[11px] xs:text-[13.5px] font-bold text-paper line-clamp-2 uppercase tracking-wide font-cinzel leading-tight">
                  {formatCollectionTitle(vol2.title)}
                </span>
                <span className="text-[9px] xs:text-[10px] font-mono text-paper-muted/60 tracking-widest uppercase mt-1">
                  {isArabic ? "طبعة أولى" : "FIRST PRINT"}
                </span>
              </div>

              {/* Right Art (Deep bleed across with wide smoky feather fade) */}
              <div className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 w-[55%] xs:w-[58%] h-full overflow-hidden pointer-events-none z-10">
                <KairoImage
                  src={vol2.coverImage}
                  alt={vol2.title}
                  sizes="(max-width: 639px) 55vw, 0px"
                  className="w-full h-full object-cover object-[center_20%] pointer-events-none group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-linear-to-r rtl:bg-linear-to-l from-[#0a0a0d] via-[#0a0a0d]/85 25%, via-[#0a0a0d]/45 60%, to-transparent pointer-events-none z-10" />
                <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0d]/85 via-transparent to-[#0a0a0d]/35 pointer-events-none z-10" />
                <div className="absolute top-2 right-2 rtl:right-auto rtl:left-2 pointer-events-none z-20 opacity-85 group-hover:opacity-100 transition-opacity">
                  <span className="text-[8px] font-serif text-vermilion font-bold tracking-wider px-1 py-0.5 rounded-xs bg-ink/80 border border-vermilion/40 backdrop-blur-xs">
                    回路
                  </span>
                </div>
              </div>
            </div>

            {/* DESKTOP / TABLET LAYOUT (sm+): Full Portrait Cover */}
            <div className="hidden sm:block w-full h-full relative">
              <KairoImage
                src={vol2.coverImage}
                alt={vol2.title}
                sizes="(max-width: 639px) 0px, 33vw"
                className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-700 ease-out transform-gpu [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
              />
              {/* Book spine curvature lighting */}
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-linear-to-r from-white/30 via-white/10 to-transparent pointer-events-none z-20" />
              <div className="absolute inset-0 bg-linear-to-t from-ink/30 via-transparent to-black/20 pointer-events-none" />

              {/* Volume Badge */}
              <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-20 pointer-events-none">
                <span className="px-2 py-0.5 rounded-xs bg-ink/80 backdrop-blur-md text-[8px] sm:text-[9px] font-mono tracking-wider text-gold/90 border border-gold/20 shadow-xs font-semibold">
                  {vol2.volumeNumber ? `${isArabic ? "المجلد" : "VOL."} ${String(vol2.volumeNumber).padStart(2, "0")}` : (isArabic ? "المجلد 02" : "VOL. 02")}
                </span>
                {vol2.stock <= 0 && (
                  <span className="px-2 py-0.5 rounded-xs bg-red-950/90 border border-red-800/80 text-[7px] sm:text-[8px] font-mono tracking-wider text-red-400 font-bold uppercase">
                    {isArabic ? "نفد" : "OUT OF STOCK"}
                  </span>
                )}
              </div>

              {/* Quick Preview Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openReader(vol2);
                }}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-xs bg-ink/85 backdrop-blur-md border border-ink-border text-paper hover:text-gold hover:border-gold transition-colors opacity-80 sm:opacity-0 sm:group-hover:opacity-100 z-30 shadow-md active:scale-90"
                title={isArabic ? "معاينة المجلد" : "Preview Volume"}
              >
                <Eye strokeWidth={1.5} className="w-3.5 h-3.5" />
              </button>

              {/* Bottom Title Bar */}
              <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3 bg-linear-to-t from-ink via-ink/95 to-transparent opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                <span className="text-[9px] sm:text-[11px] font-bold text-paper line-clamp-1 uppercase tracking-wider block">
                  {vol2.volumeNumber ? `${isArabic ? "المجلد" : "VOL."} ${String(vol2.volumeNumber).padStart(2, "0")} // ${vol2.title}` : vol2.title}
                </span>
                <span className="text-[8px] font-mono text-gold tracking-widest uppercase block mt-0.5 opacity-90">
                  {isArabic ? "طبعة أولى" : "FIRST PRINT"}
                </span>
              </div>
            </div>
          </div>

          {/* Volume 03 (Bottom on mobile, Right on desktop) */}
          <div
            ref={vol3Ref}
            onClick={() => router.push(`/manga/${vol3.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/manga/${vol3.id}`);
              }
            }}
            className="absolute w-[calc(100%-36px)] xs:w-[calc(100%-44px)] sm:w-48 lg:w-60 h-[104px] xs:h-[112px] sm:h-70 lg:h-88 rounded-xs overflow-hidden border border-ink-border/90 shadow-[0_12px_28px_rgba(0,0,0,0.72)] sm:shadow-[0_20px_50px_rgba(0,0,0,0.85)] bg-[#0a0a0d] cursor-pointer group hover:border-gold hover:shadow-[0_25px_60px_rgba(199,167,108,0.3)] transition-[border-color,box-shadow] duration-300 z-20 select-none transform-gpu [will-change:auto] sm:will-change-transform [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [isolation:isolate]"
          >
            {/* MOBILE LAYOUT (< sm): Clean Horizontal Ticket without Eye Icon */}
            <div className="flex sm:hidden w-full h-full relative items-center justify-between overflow-hidden bg-[#0a0a0d] rtl:flex-row-reverse">
              {/* Top Edge Subtle Wear (Middle from top) */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-9 h-1.5 pointer-events-none z-25 bg-[radial-gradient(ellipse_at_50%_0%,rgba(180,174,162,0.09)_0%,rgba(180,174,162,0.02)_40%,transparent_75%)]" />

              {/* Bottom-Left Corner Subtle Faded Edge Wear */}
              <div className="absolute bottom-0 left-0 w-7 h-5 pointer-events-none z-25 bg-[radial-gradient(ellipse_at_0%_100%,rgba(180,174,162,0.10)_0%,rgba(180,174,162,0.03)_35%,transparent_70%)]" />

              {/* Left Details */}
              <div className="relative z-20 flex flex-col justify-center pl-4.5 pr-2 py-3 rtl:pr-4.5 rtl:pl-2 max-w-[62%] xs:max-w-[64%]">
                <span className="inline-block self-start px-2 py-0.5 rounded-xs bg-ink/80 sm:backdrop-blur-md text-[9px] xs:text-[10px] font-mono tracking-wider text-gold/90 border border-gold/20 font-semibold mb-1">
                  {vol3.volumeNumber ? `${isArabic ? "المجلد" : "VOL."} ${String(vol3.volumeNumber).padStart(2, "0")}` : (isArabic ? "المجلد 03" : "VOL. 03")}
                </span>
                <span className="text-[11px] xs:text-[13.5px] font-bold text-paper line-clamp-2 uppercase tracking-wide font-cinzel leading-tight">
                  {formatCollectionTitle(vol3.title)}
                </span>
                <span className="text-[9px] xs:text-[10px] font-mono text-paper-muted/60 tracking-widest uppercase mt-1">
                  {isArabic ? "طبعة أولى" : "FIRST PRINT"}
                </span>
              </div>

              {/* Right Art (Deep bleed across with wide smoky feather fade) */}
              <div className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 w-[55%] xs:w-[58%] h-full overflow-hidden pointer-events-none z-10">
                <KairoImage
                  src={vol3.coverImage}
                  alt={vol3.title}
                  sizes="(max-width: 639px) 55vw, 0px"
                  className="w-full h-full object-cover object-[center_20%] pointer-events-none group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-linear-to-r rtl:bg-linear-to-l from-[#0a0a0d] via-[#0a0a0d]/85 25%, via-[#0a0a0d]/45 60%, to-transparent pointer-events-none z-10" />
                <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0d]/85 via-transparent to-[#0a0a0d]/35 pointer-events-none z-10" />
                <div className="absolute top-2 right-2 rtl:right-auto rtl:left-2 pointer-events-none z-20 opacity-85 group-hover:opacity-100 transition-opacity">
                  <span className="text-[8px] font-serif text-vermilion font-bold tracking-wider px-1 py-0.5 rounded-xs bg-ink/80 border border-vermilion/40 backdrop-blur-xs">
                    回路
                  </span>
                </div>
              </div>
            </div>

            {/* DESKTOP / TABLET LAYOUT (sm+): Full Portrait Cover */}
            <div className="hidden sm:block w-full h-full relative">
              <KairoImage
                src={vol3.coverImage}
                alt={vol3.title}
                sizes="(max-width: 639px) 0px, 33vw"
                className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-700 ease-out transform-gpu [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
              />
              {/* Book spine curvature lighting */}
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-linear-to-r from-white/30 via-white/10 to-transparent pointer-events-none z-20" />
              <div className="absolute inset-0 bg-linear-to-t from-ink/30 via-transparent to-black/20 pointer-events-none" />

              {/* Volume Badge */}
              <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-20 pointer-events-none">
                <span className="px-2 py-0.5 rounded-xs bg-ink/80 backdrop-blur-md text-[8px] sm:text-[9px] font-mono tracking-wider text-gold/90 border border-gold/20 shadow-xs font-semibold">
                  {vol3.volumeNumber ? `${isArabic ? "المجلد" : "VOL."} ${String(vol3.volumeNumber).padStart(2, "0")}` : (isArabic ? "المجلد 03" : "VOL. 03")}
                </span>
                {vol3.stock <= 0 && (
                  <span className="px-2 py-0.5 rounded-xs bg-red-950/90 border border-red-800/80 text-[7px] sm:text-[8px] font-mono tracking-wider text-red-400 font-bold uppercase">
                    {isArabic ? "نفد" : "OUT OF STOCK"}
                  </span>
                )}
              </div>

              {/* Quick Preview Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openReader(vol3);
                }}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-xs bg-ink/85 backdrop-blur-md border border-ink-border text-paper hover:text-gold hover:border-gold transition-colors opacity-80 sm:opacity-0 sm:group-hover:opacity-100 z-30 shadow-md active:scale-90"
                title={isArabic ? "معاينة المجلد" : "Preview Volume"}
              >
                <Eye strokeWidth={1.5} className="w-3.5 h-3.5" />
              </button>

              {/* Bottom Title Bar */}
              <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3 bg-linear-to-t from-ink via-ink/95 to-transparent opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                <span className="text-[9px] sm:text-[11px] font-bold text-paper line-clamp-1 uppercase tracking-wider block">
                  {vol3.volumeNumber ? `${isArabic ? "المجلد" : "VOL."} ${String(vol3.volumeNumber).padStart(2, "0")} // ${vol3.title}` : vol3.title}
                </span>
                <span className="text-[8px] font-mono text-gold tracking-widest uppercase block mt-0.5 opacity-90">
                  {isArabic ? "طبعة أولى" : "FIRST PRINT"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 03 — Bottom Climax Container (Zen Minimalist) */}
        <div className="relative w-full max-w-xl min-h-[90px] sm:min-h-[100px] flex items-center justify-center z-20 px-4 mb-8 xs:mb-10 sm:mb-8 lg:mb-0">
          {/* Clean Zen Climax CTA (Revealed upon assembly) */}
          <div
            ref={ctaRef}
            className="flex flex-col items-center text-center space-y-2.5 sm:space-y-3 w-full"
          >
            {/* Quiet Archival Metadata Bar */}
            <div className="flex flex-col items-center gap-0.5 sm:gap-1">
              <span className="text-[9px] sm:text-[10px] font-mono tracking-[0.22em] text-paper-muted/80 uppercase text-gold font-medium">
                {isArabic ? t.theCollection.badgeText : (collectionConfig?.badgeText || "COMPLETE ARCHIVE • VOL. 01–03")}
              </span>
              <span className="text-xl sm:text-2xl font-cinzel font-bold text-paper tracking-wider">
                {formatPrice(bundlePrice)}
              </span>
            </div>

            {/* Action Buttons (Dual Box Style) */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              {isBundleAvailable ? (
                <button
                  type="button"
                  onClick={handleAddBundle}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-paper text-ink font-extrabold text-xs tracking-[0.2em] uppercase rounded-sm hover:bg-vermilion hover:text-white transition-all duration-300 shadow-xl active:scale-95 cursor-pointer group"
                >
                  <ShoppingBag strokeWidth={1.5} className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>
                    {isArabic
                      ? `أضف المجموعة للسلة — ${formatPrice(bundlePrice)}`
                      : (collectionConfig?.primaryCtaText
                          ? `${collectionConfig.primaryCtaText} — ${formatPrice(bundlePrice)}`
                          : `ADD SET TO CART — ${formatPrice(bundlePrice)}`)}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-ink-surface/90 text-text-muted border border-ink-border font-bold text-xs tracking-[0.2em] uppercase rounded-sm cursor-not-allowed opacity-80"
                >
                  <span>{isArabic ? "المجموعة غير متوفرة حالياً" : "BUNDLE CURRENTLY OUT OF STOCK"}</span>
                </button>
              )}
              <Link
                href={collectionConfig?.secondaryCtaLink || "/manga?format=Box+Set"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-ink/60 backdrop-blur-md text-paper border border-ink-border font-bold text-xs tracking-[0.16em] uppercase rounded-sm hover:border-gold hover:text-gold transition-all duration-300 cursor-pointer group"
              >
                <span>{isArabic ? "استكشف كافة المجموعات" : (collectionConfig?.secondaryCtaText || "DISCOVER ALL BOXSETS")}</span>
                <ArrowRight strokeWidth={1.5} className={`w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform ${isRTL ? "rotate-180" : ""}`} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
