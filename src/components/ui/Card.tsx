import { cn } from "@/lib/cn";
import Link from "next/link";

interface CardProps {
  children: React.ReactNode;
  href?: string;
  className?: string;
  hover?: boolean;
}

export function Card({
  children,
  href,
  className,
  hover = true,
}: CardProps) {
  const styles = cn(
    "rounded-xl border border-card-border bg-card-bg p-6",
    hover &&
      "transition-all duration-300 hover:border-brand-blue/30 hover:shadow-lg hover:shadow-brand-blue/5",
    href && "cursor-pointer",
    className
  );

  if (href) {
    return (
      <Link href={href} className={styles}>
        {children}
      </Link>
    );
  }

  return <div className={styles}>{children}</div>;
}
