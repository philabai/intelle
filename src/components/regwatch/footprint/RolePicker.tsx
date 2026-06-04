"use client";

import { REGWATCH_ROLES } from "@/lib/regwatch/reference/roles";

interface Props {
  value: string;
  onChange: (next: string) => void;
}

export function RolePicker({ value, onChange }: Props) {
  return (
    <fieldset className="grid gap-2 sm:grid-cols-2">
      <legend className="sr-only">Your functional role</legend>
      {REGWATCH_ROLES.map((r) => {
        const active = value === r.value;
        return (
          <label
            key={r.value}
            className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors ${
              active
                ? "border-brand-teal bg-brand-teal/5"
                : "border-card-border bg-card-bg hover:border-brand-blue/60"
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="radio"
                name="regwatch-role"
                value={r.value}
                checked={active}
                onChange={() => onChange(r.value)}
                className="h-3.5 w-3.5 border-card-border bg-card-bg text-brand-blue focus:ring-brand-blue"
              />
              {r.label}
            </span>
            <span className="pl-6 text-xs text-muted">{r.description}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
