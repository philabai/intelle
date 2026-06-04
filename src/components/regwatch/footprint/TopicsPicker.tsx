"use client";

import { TOPIC_TAXONOMY } from "@/lib/regwatch/taxonomy";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
}

export function TopicsPicker({ value, onChange }: Props) {
  function toggle(topic: string) {
    if (value.includes(topic)) {
      onChange(value.filter((t) => t !== topic));
    } else {
      onChange([...value, topic]);
    }
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {TOPIC_TAXONOMY.map((t) => {
        const active = value.includes(t.value);
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => toggle(t.value)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              active
                ? "border-brand-teal bg-brand-teal/15 text-brand-teal"
                : "border-card-border bg-card-bg text-muted hover:border-brand-blue/60 hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
