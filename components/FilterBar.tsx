"use client";

import type { FilterState, Priority } from "@/types/task";
import { CustomSelect } from "./CustomSelect";

type FilterBarProps = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  categories: string[];
  tags: string[];
};

export function FilterBar({ filters, onChange, categories, tags }: FilterBarProps) {
  const setFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    onChange({ ...filters, [key]: value });
  };

  const categoryOptions = categories.map((cat) => ({
    value: cat,
    label: cat,
  }));

  const priorityOptions = [
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ];

  const tagOptions = tags.map((tag) => ({
    value: tag,
    label: tag,
  }));

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Category Dropdown */}
      <CustomSelect
        value={filters.category ?? ""}
        onChange={(val) => setFilter("category", val || null)}
        options={categoryOptions}
        placeholder="All Categories"
        className="w-[150px]"
      />

      {/* Priority Dropdown */}
      <CustomSelect
        value={filters.priority ?? ""}
        onChange={(val) => setFilter("priority", (val || null) as Priority | null)}
        options={priorityOptions}
        placeholder="All Priority"
        className="w-[130px]"
      />

      {/* Tag Dropdown */}
      <CustomSelect
        value={filters.tag ?? ""}
        onChange={(val) => setFilter("tag", val || null)}
        options={tagOptions}
        placeholder="All Tags"
        className="w-[120px]"
      />

      {(filters.category || filters.priority || filters.tag) && (
        <button
          onClick={() =>
            onChange({
              category: null,
              priority: null,
              dateRange: { from: null, to: null },
              tag: null,
              search: "",
            })
          }
          suppressHydrationWarning
          className="btn-tertiary text-sm"
        >
          Clear
        </button>
      )}
    </div>
  );
}
