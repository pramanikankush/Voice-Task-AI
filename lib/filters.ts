import type { Task, FilterState, Priority } from "@/types/task";

export function filterTasks(tasks: Task[], filters: FilterState): Task[] {
  return tasks.filter((task) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !task.title.toLowerCase().includes(q) &&
        !(task.description?.toLowerCase().includes(q) ?? false) &&
        !task.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        return false;
      }
    }

    if (filters.category && task.category !== filters.category) {
      return false;
    }

    if (filters.priority && task.priority !== filters.priority) {
      return false;
    }

    if (filters.tag && !task.tags.includes(filters.tag)) {
      return false;
    }

    if (filters.dateRange.from && task.due_date) {
      if (task.due_date < filters.dateRange.from) return false;
    }

    if (filters.dateRange.to && task.due_date) {
      if (task.due_date > filters.dateRange.to) return false;
    }

    return true;
  });
}

export function getCategories(tasks: Task[]): string[] {
  const cats = new Set<string>();
  tasks.forEach((t) => {
    if (t.category) cats.add(t.category);
  });
  return Array.from(cats).sort();
}

export function getTags(tasks: Task[]): string[] {
  const tagSet = new Set<string>();
  tasks.forEach((t) => t.tags.forEach((tag) => tagSet.add(tag)));
  return Array.from(tagSet).sort();
}

export function priorityColor(priority: Priority | null): string {
  switch (priority) {
    case "high":
      return "#cf2d56";
    case "medium":
      return "#c08532";
    case "low":
      return "#1f8a65";
    default:
      return "#807d72";
  }
}

export function priorityLabel(priority: Priority | null): string {
  switch (priority) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return "None";
  }
}
