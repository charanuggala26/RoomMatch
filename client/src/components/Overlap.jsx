import { useEffect, useId, useState } from "react";

// Two circles: teal is you, marigold is them. At 0% they only touch; at 100% they
// sit on top of each other. The shared area is drawn in the deep overlap green.
// Circles slide together once when the mark first appears (skipped when the
// visitor prefers reduced motion).
export default function Overlap({ score, size = 72, animate = true, label }) {
  const clipId = useId();
  const reduce =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [shown, setShown] = useState(animate && !reduce ? 0 : score);

  useEffect(() => {
    if (!animate || reduce) return setShown(score);
    const id = requestAnimationFrame(() => setShown(score));
    return () => cancelAnimationFrame(id);
  }, [score, animate, reduce]);

  const r = 20; // radius in viewBox units; viewBox is 4r wide, 2r tall
  const gap = 2 * r * (1 - shown / 100); // distance between centres
  const ax = 2 * r - gap / 2;
  const bx = 2 * r + gap / 2;
  const move = animate && !reduce ? { transition: "cx .9s cubic-bezier(.2,.8,.2,1)" } : undefined;

  return (
    <svg
      className="overlap"
      width={size * 2}
      height={size}
      viewBox={`0 0 ${4 * r} ${2 * r}`}
      role="img"
      aria-label={label || `${score}% compatible`}
    >
      <defs>
        <clipPath id={clipId}>
          <circle r={r} cy={r} style={{ cx: `${ax}px`, ...move }} />
        </clipPath>
      </defs>
      <circle r={r} cy={r} fill="var(--teal)" style={{ cx: `${ax}px`, ...move }} />
      <circle r={r} cy={r} fill="var(--marigold)" style={{ cx: `${bx}px`, ...move }} />
      <circle r={r} cy={r} fill="var(--overlap)" clipPath={`url(#${clipId})`} style={{ cx: `${bx}px`, ...move }} />
    </svg>
  );
}
