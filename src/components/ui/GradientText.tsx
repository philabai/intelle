import { cn } from "@/lib/cn";

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  variant?: "teal-blue" | "blue-violet";
}

export function GradientText({
  children,
  className,
  variant = "teal-blue",
}: GradientTextProps) {
  return (
    <span
      className={cn(
        variant === "teal-blue" ? "gradient-text" : "gradient-text-violet",
        className
      )}
    >
      {children}
    </span>
  );
}
