import Image from "next/image";
import Link from "next/link";

const LOGO_SRC = "/intelle-logo.png";
// Source asset is 540x536 (close to square). Render at the size requested.
const LOGO_NATURAL = { w: 540, h: 536 };

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-3 ${className}`}>
      <Image
        src={LOGO_SRC}
        alt="intelle.io"
        width={LOGO_NATURAL.w}
        height={LOGO_NATURAL.h}
        priority
        className="h-10 w-auto shrink-0"
      />
      <span className="hidden sm:inline text-xl font-semibold text-heading tracking-tight">
        intelle.io
      </span>
    </Link>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <Image
      src={LOGO_SRC}
      alt="intelle.io"
      width={LOGO_NATURAL.w}
      height={LOGO_NATURAL.h}
      style={{ width: size, height: "auto" }}
      className="shrink-0"
    />
  );
}
