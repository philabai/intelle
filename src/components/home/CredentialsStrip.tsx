"use client";

import { useEffect, useRef, useState } from "react";
import { CREDENTIALS } from "@/lib/constants";

function AnimatedValue({ value }: { value: string }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`text-3xl sm:text-4xl font-bold gradient-text transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {value}
    </div>
  );
}

export function CredentialsStrip() {
  return (
    <section className="py-16 border-y border-card-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {CREDENTIALS.map((cred) => (
            <div key={cred.label}>
              <AnimatedValue value={cred.value} />
              <p className="mt-2 text-sm text-muted">{cred.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
