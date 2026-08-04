/** Instagram/Twitter-style verified seal — shown for players with a real login. */
export default function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-label="Verified"
      className="inline-block shrink-0 align-middle"
    >
      <path
        fill="#0EA5E9"
        d="M12 1.5l2.09 1.9 2.72-.72 1.06 2.62 2.62 1.06-.72 2.72L21.5 12l-1.73 1.92.72 2.72-2.62 1.06-1.06 2.62-2.72-.72L12 22.5l-2.09-1.9-2.72.72-1.06-2.62-2.62-1.06.72-2.72L2.5 12l1.73-1.92-.72-2.72 2.62-1.06L7.19 2.68l2.72.72z"
      />
      <path fill="#fff" d="M10.55 15.63l-2.93-2.93 1.27-1.27 1.66 1.66 4.56-4.56 1.27 1.27z" />
    </svg>
  );
}
