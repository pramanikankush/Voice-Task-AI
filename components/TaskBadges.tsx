"use client";

import type { Priority } from "@/types/task";
import { priorityColor, priorityLabel } from "@/lib/filters";

type TaskBadgesProps = {
  priority: Priority | null;
  category: string | null;
  tags: string[];
};

export function TaskBadges({ priority, category, tags }: TaskBadgesProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {priority && (
        <span
          className="badge-pill"
          style={{ color: priorityColor(priority) }}
        >
          {priorityLabel(priority)}
        </span>
      )}
      {category && <span className="badge-pill">{category}</span>}
      {tags.slice(0, 3).map((tag) => (
        <span key={tag} className="badge-pill">
          {tag}
        </span>
      ))}
      {tags.length > 3 && (
        <span className="badge-pill">+{tags.length - 3}</span>
      )}
    </div>
  );
}
