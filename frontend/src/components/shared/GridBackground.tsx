"use client";

/**
 * Shared subtle grid/dot background texture used across multiple pages.
 * Keeps the background decoration DRY and consistent.
 */

interface GridBackgroundProps {
  variant?: "dot" | "line";
  opacity?: number;
  color?: string;
  size?: number;
  className?: string;
}

export default function GridBackground({
  variant = "dot",
  opacity = 0.03,
  color = "var(--color-walnut)",
  size = 40,
  className = "",
}: GridBackgroundProps) {
  const style =
    variant === "dot"
      ? {
          backgroundImage: `radial-gradient(circle at 1px 1px, ${color} 1px, transparent 0)`,
          backgroundSize: `${size}px ${size}px`,
        }
      : {
          backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
          backgroundSize: `${size}px ${size}px`,
        };

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ ...style, opacity }}
    />
  );
}
