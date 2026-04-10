import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-3 ${className}`}>
      <svg
        width="40"
        height="40"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Hexagonal shape */}
        <path
          d="M50 5L93.3 27.5V72.5L50 95L6.7 72.5V27.5L50 5Z"
          fill="url(#hex-gradient)"
          stroke="url(#hex-stroke)"
          strokeWidth="2"
        />
        {/* Inner "i" letter */}
        <circle cx="50" cy="30" r="5" fill="white" />
        <rect x="45" y="40" width="10" height="30" rx="3" fill="white" />
        <defs>
          <linearGradient
            id="hex-gradient"
            x1="6.7"
            y1="5"
            x2="93.3"
            y2="95"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#00D4C4" />
            <stop offset="0.5" stopColor="#2563FF" />
            <stop offset="1" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient
            id="hex-stroke"
            x1="6.7"
            y1="5"
            x2="93.3"
            y2="95"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#00D4C4" />
            <stop offset="1" stopColor="#2563FF" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex flex-col">
        <span className="text-xl font-semibold text-white tracking-tight">
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
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M50 5L93.3 27.5V72.5L50 95L6.7 72.5V27.5L50 5Z"
        fill="url(#hex-gradient-mark)"
        stroke="url(#hex-stroke-mark)"
        strokeWidth="2"
      />
      <circle cx="50" cy="30" r="5" fill="white" />
      <rect x="45" y="40" width="10" height="30" rx="3" fill="white" />
      <defs>
        <linearGradient
          id="hex-gradient-mark"
          x1="6.7"
          y1="5"
          x2="93.3"
          y2="95"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#00D4C4" />
          <stop offset="0.5" stopColor="#2563FF" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient
          id="hex-stroke-mark"
          x1="6.7"
          y1="5"
          x2="93.3"
          y2="95"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#00D4C4" />
          <stop offset="1" stopColor="#2563FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
