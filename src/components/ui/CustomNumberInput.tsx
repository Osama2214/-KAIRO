"use client";

import React, { useRef, useCallback } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

export interface CustomNumberInputProps {
  id?: string;
  name?: string;
  value?: number | string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement> | { target: { value: string; name?: string } }) => void;
  onValueChange?: (val: number) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  "aria-label"?: string;
}

function getPrecision(stepVal?: number | "any"): number {
  if (!stepVal || stepVal === "any") return 2;
  const str = stepVal.toString();
  if (str.includes(".")) {
    return str.split(".")[1].length;
  }
  return 0;
}

export function CustomNumberInput({
  id,
  name,
  value = "",
  onChange,
  onValueChange,
  min,
  max,
  step = 1,
  placeholder,
  required = false,
  disabled = false,
  className = "",
  inputClassName = "",
  prefix,
  suffix,
  "aria-label": ariaLabel,
}: CustomNumberInputProps) {
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const precision = getPrecision(step);
  const stepAmount = typeof step === "number" ? step : 1;

  const getNumericValue = useCallback((): number => {
    if (value === "" || value === undefined || value === null) {
      return typeof min === "number" ? min : 0;
    }
    const parsed = typeof value === "number" ? value : parseFloat(value.toString());
    return isNaN(parsed) ? (typeof min === "number" ? min : 0) : parsed;
  }, [value, min]);

  const emitChange = useCallback(
    (nextVal: number) => {
      const clamped = parseFloat(nextVal.toFixed(precision));
      const strVal = clamped.toString();

      if (onChange) {
        onChange({
          target: {
            value: strVal,
            name,
          },
        });
      }
      if (onValueChange) {
        onValueChange(clamped);
      }
    },
    [onChange, onValueChange, name, precision]
  );

  const handleIncrement = useCallback(() => {
    if (disabled) return;
    const current = getNumericValue();
    let next = current + stepAmount;
    if (typeof max === "number" && next > max) next = max;
    emitChange(next);
  }, [disabled, getNumericValue, stepAmount, max, emitChange]);

  const handleDecrement = useCallback(() => {
    if (disabled) return;
    const current = getNumericValue();
    let next = current - stepAmount;
    if (typeof min === "number" && next < min) next = min;
    emitChange(next);
  }, [disabled, getNumericValue, stepAmount, min, emitChange]);

  const stopHolding = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  const startHolding = useCallback(
    (action: () => void) => {
      if (disabled) return;
      stopHolding();
      holdTimeoutRef.current = setTimeout(() => {
        holdIntervalRef.current = setInterval(() => {
          action();
        }, 60);
      }, 300);
    },
    [disabled, stopHolding]
  );

  const numVal = getNumericValue();
  const isAtMin = typeof min === "number" && value !== "" && numVal <= min;
  const isAtMax = typeof max === "number" && value !== "" && numVal >= max;

  return (
    <div
      className={`relative flex items-stretch h-10 bg-ink border border-ink-border rounded-sm overflow-hidden transition-all focus-within:border-gold group/input ${
        disabled ? "opacity-50 pointer-events-none" : ""
      } ${className}`}
    >
      {prefix && (
        <span className="flex items-center pl-3 pr-1 text-gold font-mono text-xs select-none shrink-0">
          {prefix}
        </span>
      )}

      <input
        ref={inputRef}
        id={id}
        name={name}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-label={ariaLabel}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            handleIncrement();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            handleDecrement();
          }
        }}
        onChange={(e) => {
          onChange?.(e);
          const parsed = parseFloat(e.target.value);
          if (!isNaN(parsed) && onValueChange) {
            onValueChange(parsed);
          }
        }}
        className={`flex-1 min-w-0 h-full bg-transparent text-paper px-3 py-0 outline-none font-sans text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${inputClassName}`}
      />

      {suffix && (
        <span className="flex items-center pr-2 text-text-muted font-mono text-xs select-none shrink-0">
          {suffix}
        </span>
      )}

      {/* Custom YUJI Luxury Stepper Controls */}
      <div className="flex flex-col h-full w-7 shrink-0 border-l border-ink-border divide-y divide-ink-border/70 bg-ink-surface/70 select-none">
        <button
          type="button"
          tabIndex={-1}
          onClick={handleIncrement}
          onMouseDown={(e) => {
            e.preventDefault();
            startHolding(handleIncrement);
          }}
          onMouseUp={stopHolding}
          onMouseLeave={stopHolding}
          onTouchStart={(e) => {
            e.preventDefault();
            startHolding(handleIncrement);
          }}
          onTouchEnd={stopHolding}
          disabled={disabled || isAtMax}
          aria-label="Increase number"
          className="flex-1 flex items-center justify-center p-0 text-text-muted/80 hover:text-gold hover:bg-ink-elevated active:bg-ink-surface transition-colors disabled:opacity-20 disabled:pointer-events-none cursor-pointer group/up"
        >
          <ChevronUp strokeWidth={2.4} className="w-3.5 h-3.5 group-hover/up:scale-115 transition-transform" />
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={handleDecrement}
          onMouseDown={(e) => {
            e.preventDefault();
            startHolding(handleDecrement);
          }}
          onMouseUp={stopHolding}
          onMouseLeave={stopHolding}
          onTouchStart={(e) => {
            e.preventDefault();
            startHolding(handleDecrement);
          }}
          onTouchEnd={stopHolding}
          disabled={disabled || isAtMin}
          aria-label="Decrease number"
          className="flex-1 flex items-center justify-center p-0 text-text-muted/80 hover:text-gold hover:bg-ink-elevated active:bg-ink-surface transition-colors disabled:opacity-20 disabled:pointer-events-none cursor-pointer group/down"
        >
          <ChevronDown strokeWidth={2.4} className="w-3.5 h-3.5 group-hover/down:scale-115 transition-transform" />
        </button>
      </div>
    </div>
  );
}
