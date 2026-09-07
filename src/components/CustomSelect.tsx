"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
  badge?: string;
}

interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  labelPrefix?: string;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  align?: "left" | "right";
  fullWidth?: boolean;
}

export function CustomSelect({
  options,
  value,
  onChange,
  labelPrefix,
  placeholder = "Select...",
  className = "",
  buttonClassName = "",
  dropdownClassName = "",
  align = "left",
  fullWidth = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? "w-full" : "w-56 sm:w-64"} ${isOpen ? "z-40" : "z-10"} ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-3 text-xs font-mono tracking-wider bg-ink-surface border border-ink-border hover:border-gold/60 rounded-xs px-3.5 py-2.5 text-paper transition-all cursor-pointer select-none ${
          isOpen ? "border-gold ring-1 ring-gold/30 shadow-lg shadow-black/60" : ""
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate">
          {labelPrefix && (
            <span className="text-text-muted uppercase text-[10px] tracking-widest shrink-0">
              {labelPrefix}
            </span>
          )}
          <span className="font-bold text-paper uppercase truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          strokeWidth={1.8}
          className={`w-3.5 h-3.5 text-gold shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Custom Luxury Dropdown Menu - Exactly the same width as the button */}
      {isOpen && (
        <div
          data-lenis-prevent
          className={`absolute z-50 mt-1.5 w-full ${align === "right" ? "right-0" : "left-0"} max-h-72 overflow-y-auto bg-ink border border-ink-border rounded-xs shadow-[0_20px_50px_rgba(0,0,0,0.98)] p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 ${dropdownClassName}`}
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xs text-xs font-mono tracking-wider transition-all text-left cursor-pointer group ${
                  isSelected
                    ? "bg-gold/15 text-gold font-bold border-l-2 border-gold shadow-sm"
                    : "text-text-muted hover:text-paper hover:bg-ink-surface/90"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate uppercase">{option.label}</span>
                  {option.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] rounded-xs bg-gold/10 text-gold border border-gold/30">
                      {option.badge}
                    </span>
                  )}
                </div>

                {isSelected && (
                  <Check strokeWidth={2} className="w-3.5 h-3.5 text-gold shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
