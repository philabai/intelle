import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-3 ${className}`}>
      <svg
        width="40"
        height="40"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Outer hexagon */}
        <path
          d="M60 4L110 32.9V88.1L60 116L10 88.1V32.9L60 4Z"
          fill="url(#logo-hex-bg)"
        />
        {/* Left facet */}
        <path
          d="M60 4L10 32.9V88.1L60 60V4Z"
          fill="url(#logo-facet-left)"
          opacity="0.9"
        />
        {/* Right facet */}
        <path
          d="M60 4L110 32.9V60L60 60V4Z"
          fill="url(#logo-facet-right)"
          opacity="0.85"
        />
        {/* Bottom facet */}
        <path
          d="M10 88.1L60 116L110 88.1V60L60 60L10 60V88.1Z"
          fill="url(#logo-facet-bottom)"
          opacity="0.8"
        />
        {/* Inner "i" dot */}
        <circle cx="60" cy="38" r="5.5" fill="white" />
        {/* Inner "i" bar */}
        <rect x="54.5" y="50" width="11" height="28" rx="3.5" fill="white" />

        <defs>
          <linearGradient id="logo-hex-bg" x1="10" y1="4" x2="110" y2="116" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00D4C4" />
            <stop offset="0.5" stopColor="#2563FF" />
            <stop offset="1" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id="logo-facet-left" x1="10" y1="32" x2="60" y2="88" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1A3A8F" />
            <stop offset="1" stopColor="#00B4D8" />
          </linearGradient>
          <linearGradient id="logo-facet-right" x1="60" y1="4" x2="110" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00D4C4" />
            <stop offset="1" stopColor="#2563FF" />
          </linearGradient>
          <linearGradient id="logo-facet-bottom" x1="10" y1="60" x2="110" y2="116" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2563FF" />
            <stop offset="1" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex flex-col">
        <span className="text-xl font-semibold text-heading tracking-tight">
          intelle.io
        </span>
      </div>
    </Link>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M60 4L110 32.9V88.1L60 116L10 88.1V32.9L60 4Z"
        fill="url(#mark-hex-bg)"
      />
      <path d="M60 4L10 32.9V88.1L60 60V4Z" fill="url(#mark-facet-left)" opacity="0.9" />
      <path d="M60 4L110 32.9V60L60 60V4Z" fill="url(#mark-facet-right)" opacity="0.85" />
      <path d="M10 88.1L60 116L110 88.1V60L60 60L10 60V88.1Z" fill="url(#mark-facet-bottom)" opacity="0.8" />
      <circle cx="60" cy="38" r="5.5" fill="white" />
      <rect x="54.5" y="50" width="11" height="28" rx="3.5" fill="white" />
      <defs>
        <linearGradient id="mark-hex-bg" x1="10" y1="4" x2="110" y2="116" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D4C4" />
          <stop offset="0.5" stopColor="#2563FF" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="mark-facet-left" x1="10" y1="32" x2="60" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1A3A8F" />
          <stop offset="1" stopColor="#00B4D8" />
        </linearGradient>
        <linearGradient id="mark-facet-right" x1="60" y1="4" x2="110" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D4C4" />
          <stop offset="1" stopColor="#2563FF" />
        </linearGradient>
        <linearGradient id="mark-facet-bottom" x1="10" y1="60" x2="110" y2="116" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563FF" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
    </svg>
  );
}
