interface LaurelWreathProps {
  className?: string;
  /** Leaf color (defaults to the brand pine accent) */
  leafColor?: string;
  /** Stem + berry color (defaults to the brand gold accent) */
  stemColor?: string;
}

/**
 * Hand-crafted decorative laurel wreath — used as a "hall of fame" motif
 * on the Prodigies page. Pure vector, no external assets, themes via
 * the site's CSS custom properties by default.
 */
export default function LaurelWreath({
  className = "",
  leafColor = "var(--color-pine)",
  stemColor = "var(--color-gold)",
}: LaurelWreathProps) {
  return (
    <svg viewBox="0 0 120 128" className={className} aria-hidden="true">
      <path
        d="M70.8 111.8 L77.5 109.7 L83.9 106.6 L89.8 102.7 L95.0 97.9 L99.4 92.4 L103.0 86.3 L105.7 79.8 L107.3 72.9 L108.0 65.9 L107.6 58.8 L106.2 51.9 L103.8 45.3 L100.4 39.1 L96.2 33.4 L91.1 28.5 L85.4 24.3"
        stroke={stemColor}
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M49.2 111.8 L42.5 109.7 L36.1 106.6 L30.2 102.7 L25.0 97.9 L20.6 92.4 L17.0 86.3 L14.3 79.8 L12.7 72.9 L12.0 65.9 L12.4 58.8 L13.8 51.9 L16.2 45.3 L19.6 39.1 L23.8 33.4 L28.9 28.5 L34.6 24.3"
        stroke={stemColor}
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
      {[
        "M70.8 111.8Q70.8 119.1 79.4 124.1Q77.7 114.3 70.8 111.8Z",
        "M85.6 105.6Q87.9 112.0 96.9 113.7Q92.4 105.7 85.6 105.6Z",
        "M97.6 94.8Q101.5 99.7 109.9 98.5Q103.6 92.8 97.6 94.8Z",
        "M105.3 80.7Q110.2 83.8 117.1 80.2Q109.9 77.2 105.3 80.7Z",
        "M108.0 64.9Q113.1 66.0 117.9 60.8Q110.8 60.5 108.0 64.9Z",
        "M105.3 49.0Q109.9 48.5 112.5 42.7Q106.4 44.5 105.3 49.0Z",
        "M97.5 35.0Q101.2 33.2 101.6 27.5Q97.0 30.8 97.5 35.0Z",
        "M85.4 24.3Q88.0 21.7 86.7 16.9Q83.9 21.0 85.4 24.3Z",
        "M49.2 111.8Q42.3 114.3 40.6 124.1Q49.2 119.1 49.2 111.8Z",
        "M34.4 105.6Q27.6 105.7 23.1 113.7Q32.1 112.0 34.4 105.6Z",
        "M22.4 94.8Q16.4 92.8 10.1 98.5Q18.5 99.7 22.4 94.8Z",
        "M14.7 80.7Q10.1 77.2 2.9 80.2Q9.8 83.8 14.7 80.7Z",
        "M12.0 64.9Q9.2 60.5 2.1 60.8Q6.9 66.0 12.0 64.9Z",
        "M14.7 49.0Q13.6 44.5 7.5 42.7Q10.1 48.5 14.7 49.0Z",
        "M22.5 35.0Q23.0 30.8 18.4 27.5Q18.8 33.2 22.5 35.0Z",
        "M34.6 24.3Q36.1 21.0 33.3 16.9Q32.0 21.7 34.6 24.3Z",
      ].map((d, i) => (
        <path key={i} d={d} fill={leafColor} />
      ))}
      <circle cx="60.0" cy="113.0" r="2.6" fill={stemColor} />
    </svg>
  );
}
