"use client";

import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { TimeUnitPicker } from "@/components/admin/TimeUnitPicker";

/**
 * A date and time field drawn in the console's own colours.
 *
 * `<input type="datetime-local">` hands the whole picker to the browser: a
 * white panel with blue highlights and a US month/day order, sitting on a dark
 * page and ignoring every token the rest of the console is built from. None of
 * that is styleable — browsers deliberately do not expose it — so the only way
 * to make it match is to draw it.
 *
 * The value stays epoch milliseconds, which is what the coupon API speaks.
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
/** Five-minute steps: a promotion has never needed 14:37. */
const MINUTES = Array.from({ length: 12 }, (_, step) => step * 5);

const pad = (n: number) => String(n).padStart(2, "0");

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/** The 42 cells of a month grid: leading blanks, the month, then trailing blanks. */
function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DateTimeField({
  value,
  onChange,
  label,
  hint,
}: {
  /** Epoch milliseconds, or null for "not set". */
  value: number | null;
  onChange: (value: number | null) => void;
  label: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value) : null;
  const [view, setView] = useState(() => selected ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Clicking away or pressing Escape closes it, the way a native picker does.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const display = selected
    ? `${pad(selected.getDate())} ${MONTHS[selected.getMonth()].slice(0, 3)} ${selected.getFullYear()} · ${pad(selected.getHours())}:${pad(selected.getMinutes())}`
    : "";

  /** Keeps the time already chosen when only the day changes, and vice versa. */
  const commit = (date: Date) => onChange(date.getTime());

  const pickDay = (day: Date) => {
    const next = new Date(day);
    if (selected) {
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    } else {
      // A promotion starting at midnight is the sane default for a new date.
      next.setHours(0, 0, 0, 0);
    }
    commit(next);
  };

  const pickTime = (hours: number, minutes: number) => {
    const next = selected ? new Date(selected) : new Date(view);
    next.setHours(hours, minutes, 0, 0);
    commit(next);
  };

  const cells = monthGrid(view.getFullYear(), view.getMonth());
  const today = new Date();

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-text-muted mb-1">{label}</label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={`flex-1 h-10 flex items-center justify-between gap-2 bg-ink border px-3 rounded-sm text-left transition-colors cursor-pointer ${
            open ? "border-gold" : "border-ink-border hover:border-gold/50"
          }`}
        >
          <span className={display ? "text-paper" : "text-text-muted/60"}>
            {display || "Not set"}
          </span>
          <CalendarDays className="w-3.5 h-3.5 text-text-muted shrink-0" />
        </button>

        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            title="Clear"
            className="p-2 text-text-muted hover:text-vermilion border border-ink-border rounded-sm cursor-pointer transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {hint && <span className="text-[10px] text-text-muted">{hint}</span>}

      {open && (
        <div className="absolute z-[120] mt-2 w-[19rem] bg-ink border border-gold/40 rounded-sm shadow-2xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              aria-label="Previous month"
              className="p-1.5 text-text-muted hover:text-gold rounded-xs cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-paper tracking-wider uppercase">
              {MONTHS[view.getMonth()]} {view.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              aria-label="Next month"
              className="p-1.5 text-text-muted hover:text-gold rounded-xs cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((day) => (
              <span key={day} className="text-[10px] text-text-muted/70 py-1">
                {day}
              </span>
            ))}
            {cells.map((day, index) => {
              if (!day) return <span key={index} />;
              const isSelected = selected ? sameDay(day, selected) : false;
              const isToday = sameDay(day, today);
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => pickDay(day)}
                  className={`h-8 text-xs rounded-xs transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-gold text-ink font-bold"
                      : isToday
                        ? "text-gold border border-gold/40 hover:bg-gold/15"
                        : "text-paper-muted hover:bg-ink-elevated hover:text-paper"
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-ink-border space-y-2">
            <span className="text-[10px] text-text-muted uppercase tracking-wider">Time</span>
            <div className="flex items-center gap-2">
              <TimeUnitPicker
                ariaLabel="Hour"
                value={selected ? selected.getHours() : 0}
                options={HOURS}
                onChange={(hour) => pickTime(hour, selected ? selected.getMinutes() : 0)}
              />
              <span className="text-text-muted">:</span>
              <TimeUnitPicker
                ariaLabel="Minute"
                value={selected ? selected.getMinutes() : 0}
                options={MINUTES}
                onChange={(minute) => pickTime(selected ? selected.getHours() : 0, minute)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-ink-border">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="text-[11px] text-text-muted hover:text-vermilion cursor-pointer transition-colors uppercase tracking-wider"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 bg-gold hover:bg-gold-muted text-ink text-[11px] font-bold uppercase tracking-wider rounded-xs cursor-pointer transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
