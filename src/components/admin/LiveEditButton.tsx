"use client";

import React from "react";
import { Edit2 } from "lucide-react";
import { useStorefrontStore, LiveEditTarget } from "@/store/useStorefrontStore";
import { useMounted } from "@/store/useWishlistStore";

interface LiveEditButtonProps {
  target: LiveEditTarget;
  label?: string;
  className?: string;
  variant?: "floating" | "inline" | "badge" | "card";
  size?: "xs" | "sm" | "md";
}

export function LiveEditButton({
  target,
  label,
  className = "",
  variant = "inline",
  size = "sm",
}: LiveEditButtonProps) {
  const mounted = useMounted();
  const isAdminAuthenticated = useStorefrontStore((state) => state.isAdminAuthenticated);
  const isVisualEditorActive = useStorefrontStore((state) => state.isVisualEditorActive);
  const openLiveEdit = useStorefrontStore((state) => state.openLiveEdit);

  if (!mounted || !isAdminAuthenticated || !isVisualEditorActive) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openLiveEdit(target);
  };

  const iconSizes = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
  };

  if (variant === "card") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={label || "Edit Item in Live Mode"}
        className={`group/live absolute top-2.5 left-2.5 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-ink/90 hover:bg-gold text-gold hover:text-ink border border-gold/40 hover:border-gold shadow-lg backdrop-blur-md transition-all duration-200 transform hover:scale-105 cursor-pointer font-mono text-[10px] font-bold uppercase tracking-wider ${className}`}
      >
        <Edit2 strokeWidth={2} className={`${iconSizes[size]} transition-transform group-hover/live:rotate-12`} />
        {label && <span className="inline">{label}</span>}
      </button>
    );
  }

  if (variant === "floating") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={label || "Edit Section in Live Mode"}
        className={`group/live z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink/90 hover:bg-gold text-gold hover:text-ink border border-gold/50 shadow-xl backdrop-blur-md transition-all duration-200 hover:scale-105 cursor-pointer font-mono text-[11px] font-bold uppercase tracking-wider ${className}`}
      >
        <Edit2 strokeWidth={2} className={`${iconSizes[size]} transition-transform group-hover/live:rotate-12`} />
        <span>{label || "Edit"}</span>
      </button>
    );
  }

  if (variant === "badge") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={label || "Edit in Live Mode"}
        className={`group/live inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-gold/10 hover:bg-gold text-gold hover:text-ink border border-gold/40 hover:border-gold transition-colors cursor-pointer font-mono text-[10px] font-bold uppercase tracking-wider ${className}`}
      >
        <Edit2 strokeWidth={2} className={`${iconSizes[size]}`} />
        {label && <span>{label}</span>}
      </button>
    );
  }

  // Default inline variant
  return (
    <button
      type="button"
      onClick={handleClick}
      title={label || "Edit in Live Mode"}
      className={`group/live inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-ink-surface/90 hover:bg-gold text-gold hover:text-ink border border-gold/40 hover:border-gold transition-all duration-200 hover:scale-105 cursor-pointer font-mono text-[11px] font-bold uppercase tracking-wider shadow-sm ${className}`}
    >
      <Edit2 strokeWidth={2} className={`${iconSizes[size]} transition-transform group-hover/live:rotate-12`} />
      <span>{label || "Edit"}</span>
    </button>
  );
}
