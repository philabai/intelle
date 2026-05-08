import Link from "next/link";

/**
 * Two SVG components that render the same hexagonal-cube mark.
 * `Logo` includes the wordmark; `LogoMark` is the icon only.
 *
 * Geometry: an isometric cube viewed slightly above. The outer silhouette is
 * a regular hexagon. Three visible faces:
 *   - Top face          (cyan -> light blue)
 *   - Front-left face   (violet -> indigo)
 *   - Front-right face  (cyan -> blue)
 * An 'i' letterform sits centered in the front of the cube.
 */

function HexCube({ size = 40, gradId }: { size?: number; gradId: string }) {
  const top = `${gradId}-top`;
  const left = `${gradId}-left`;
  const right = `${gradId}-right`;
  const stroke = `${gradId}-stroke`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Top face — parallelogram from upper apex to centre */}
      <path d="M60 4 L110 32.9 L60 60 L10 32.9 Z" fill={`url(#${top})`} />
      {/* Front-left face */}
      <path d="M10 32.9 L60 60 L60 116 L10 88.1 Z" fill={`url(#${left})`} />
      {/* Front-right face */}
      <path d="M110 32.9 L60 60 L60 116 L110 88.1 Z" fill={`url(#${right})`} />
      {/* Subtle outer stroke for crispness on light backgrounds */}
      <path
        d="M60 4 L110 32.9 L110 88.1 L60 116 L10 88.1 L10 32.9 Z"
        fill="none"
        stroke={`url(#${stroke})`}
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.35"
      />
      {/* Edge highlights along the three internal seams */}
      <path d="M60 4 L60 60" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.25" />
      <path d="M10 32.9 L60 60" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.18" />
      <path d="M110 32.9 L60 60" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.18" />

      {/* 'i' letterform — sits centred on the front of the cube */}
      <circle cx="60" cy="62" r="5" fill="#FFFFFF" opacity="0.96" />
      <rect
        x="55.5"
        y="73"
        width="9"
        height="26"
        rx="2.5"
        fill="#FFFFFF"
        opacity="0.96"
      />

      <defs>
        {/* Top face: cyan -> light blue */}
        <linearGradient
          id={top}
          x1="10"
          y1="4"
          x2="110"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4DE3F0" />
          <stop offset="1" stopColor="#5DA5FF" />
        </linearGradient>
        {/* Left face: violet -> deep indigo */}
        <linearGradient
          id={left}
          x1="10"
          y1="32"
          x2="60"
          y2="116"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#7C3AED" />
          <stop offset="1" stopColor="#3730A3" />
        </linearGradient>
        {/* Right face: bright cyan -> blue */}
        <linearGradient
          id={right}
          x1="110"
          y1="32"
          x2="60"
          y2="116"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#22D3EE" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        {/* Outer stroke gradient */}
        <linearGradient
          id={stroke}
          x1="0"
          y1="0"
          x2="120"
          y2="120"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#22D3EE" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-3 ${className}`}>
      <HexCube size={40} gradId="logo" />
      <div className="flex flex-col">
        <span className="text-xl font-semibold text-heading tracking-tight">
          intelle.io
        </span>
      </div>
    </Link>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return <HexCube size={size} gradId={`mark-${size}`} />;
}
