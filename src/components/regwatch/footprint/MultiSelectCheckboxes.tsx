"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

interface Option {
  value: string;
  label: string;
  hint?: string;
}

interface GroupedOption {
  groupLabel: string;
  options: Option[];
}

interface Props {
  options: Option[] | GroupedOption[];
  grouped?: boolean;
  selected: string[];
  onChange: (next: string[]) => void;
  /** Show a free-text filter above the list. */
  searchable?: boolean;
  /** Empty-state copy when no rows match the filter. */
  emptyLabel?: string;
  /** Display the selection count badge. */
  showCount?: boolean;
  /** Optional className for the outer scroll container. */
  className?: string;
}

/**
 * Generic multi-select checkbox list used by the geography, activities,
 * regulators, and topics pickers. Supports flat or grouped option lists,
 * optional free-text search, and renders the selection as a chip set the user
 * can click to deselect individually.
 */
export function MultiSelectCheckboxes({
  options,
  grouped = false,
  selected,
  onChange,
  searchable = false,
  emptyLabel,
  showCount = true,
  className,
}: Props) {
  const t = useTranslations("regwatch.comply");
  const resolvedEmptyLabel = emptyLabel ?? t("noOptions");
  const [filter, setFilter] = useState("");

  const flat = useMemo<Option[]>(() => {
    if (grouped) {
      return (options as GroupedOption[]).flatMap((g) => g.options);
    }
    return options as Option[];
  }, [grouped, options]);

  const labelByValue = useMemo(() => {
    const m = new Map<string, string>();
    flat.forEach((o) => m.set(o.value, o.label));
    return m;
  }, [flat]);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  function matches(o: Option): boolean {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q);
  }

  return (
    <div className="space-y-3">
      {searchable && (
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("filterPlaceholder")}
          className="w-full rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-sm text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
        />
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => toggle(v)}
              className="inline-flex items-center gap-1 rounded-full bg-brand-teal/10 px-2 py-0.5 text-[11px] text-brand-teal hover:bg-brand-teal/20"
            >
              {labelByValue.get(v) ?? v}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}

      <div
        className={
          className ??
          "max-h-72 overflow-y-auto rounded-lg border border-card-border bg-background/40 p-3"
        }
      >
        {grouped ? (
          <GroupedList
            groups={(options as GroupedOption[]).map((g) => ({
              ...g,
              options: g.options.filter(matches),
            }))}
            selected={selected}
            onToggle={toggle}
            emptyLabel={resolvedEmptyLabel}
          />
        ) : (
          <FlatList
            options={flat.filter(matches)}
            selected={selected}
            onToggle={toggle}
            emptyLabel={resolvedEmptyLabel}
          />
        )}
      </div>

      {showCount && (
        <p className="text-xs text-muted">
          {t("selectedCount", { count: selected.length })}
        </p>
      )}
    </div>
  );
}

function FlatList({
  options,
  selected,
  onToggle,
  emptyLabel,
}: {
  options: Option[];
  selected: string[];
  onToggle: (v: string) => void;
  emptyLabel: string;
}) {
  if (options.length === 0) {
    return <p className="text-xs text-muted">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {options.map((o) => (
        <li key={o.value}>
          <CheckboxRow option={o} checked={selected.includes(o.value)} onToggle={onToggle} />
        </li>
      ))}
    </ul>
  );
}

function GroupedList({
  groups,
  selected,
  onToggle,
  emptyLabel,
}: {
  groups: GroupedOption[];
  selected: string[];
  onToggle: (v: string) => void;
  emptyLabel: string;
}) {
  const nonEmpty = groups.filter((g) => g.options.length > 0);
  if (nonEmpty.length === 0) {
    return <p className="text-xs text-muted">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-4">
      {nonEmpty.map((g) => (
        <div key={g.groupLabel}>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted">
            {g.groupLabel}
          </p>
          <ul className="space-y-1.5">
            {g.options.map((o) => (
              <li key={o.value}>
                <CheckboxRow
                  option={o}
                  checked={selected.includes(o.value)}
                  onToggle={onToggle}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function CheckboxRow({
  option,
  checked,
  onToggle,
}: {
  option: Option;
  checked: boolean;
  onToggle: (v: string) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1 hover:bg-card-bg">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(option.value)}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-card-border bg-card-bg text-brand-blue focus:ring-brand-blue"
      />
      <span className="flex-1 text-xs text-foreground">
        {option.label}
        {option.hint && (
          <span className="ms-1 font-mono text-[10px] text-muted">{option.hint}</span>
        )}
      </span>
    </label>
  );
}
