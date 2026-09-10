import React from "react";
import { Star } from "lucide-react";

/**
 * Five stars filled to match the score.
 *
 * Every rating row used to draw five solid stars no matter what the number
 * said, so a 4.3 and a 5.0 looked identical. Each star here is filled by the
 * fraction of it the score actually earns, clipped from the inline start so it
 * reads correctly in both LTR and RTL.
 */
export function StarRating({
  value,
  size = "sm",
  className = "",
}: {
  value: number;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const score = Math.max(0, Math.min(5, Number(value) || 0));
  const starSize = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
  }[size];

  return (
    <div
      className={`flex items-center ${className}`}
      role="img"
      aria-label={`${score.toFixed(1)} out of 5`}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.max(0, Math.min(1, score - index));
        return (
          <span key={index} className={`relative inline-block ${starSize}`}>
            <Star strokeWidth={1} className={`${starSize} text-gold/35`} aria-hidden />
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
                aria-hidden
              >
                <Star strokeWidth={1} className={`${starSize} fill-gold text-gold`} />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
