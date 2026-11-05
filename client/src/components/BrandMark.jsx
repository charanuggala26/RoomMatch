export default function BrandMark({ size = 28 }) {
  return (
    <svg width={size * 1.6} height={size} viewBox="0 0 40 25" aria-hidden="true">
      <circle cx="12.5" cy="12.5" r="12" fill="var(--teal)" />
      <circle cx="27.5" cy="12.5" r="12" fill="var(--marigold)" />
      <path d="M20 2.2a12 12 0 0 1 0 20.6 12 12 0 0 1 0-20.6Z" fill="var(--overlap)" />
    </svg>
  );
}
