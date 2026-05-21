"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Task } from "@/types/task";
import { TaskBadges } from "./TaskBadges";
import { priorityColor } from "@/lib/filters";
import { updateTaskStatus } from "@/app/actions/extract-tasks";

type TaskListProps = {
  tasks: Task[];
  onTasksChange: () => void;
};

export function TaskList({ tasks, onTasksChange }: TaskListProps) {
  const handleToggleStatus = async (task: Task) => {
    const nextStatus = task.status === "done" ? "pending" : "done";
    await updateTaskStatus(task.id, nextStatus);
    onTasksChange();
  };

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {tasks.map((task) => (
          <motion.div
            key={task.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <div className="card p-4 flex items-start gap-4">
              <button
                onClick={() => handleToggleStatus(task)}
                className={`mt-1 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  task.status === "done"
                    ? "bg-semantic-success border-semantic-success"
                    : "border-hairline-strong hover:border-primary"
                }`}
                aria-label={`Mark ${task.status === "done" ? "pending" : "done"}`}
              >
                {task.status === "done" && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6L5 8.5L9.5 3.5"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: priorityColor(task.priority),
                    }}
                  />
                  <h4
                    className={`font-display text-title-sm ${
                      task.status === "done"
                        ? "text-muted-soft line-through"
                        : "text-ink"
                    }`}
                  >
                    {task.title}
                  </h4>
                </div>
                {task.description && (
                  <p className="text-body-sm text-body ml-5 line-clamp-1">
                    {task.description}
                  </p>
                )}
                <div className="mt-2 ml-5">
                  <TaskBadges
                    priority={task.priority}
                    category={task.category}
                    tags={task.tags}
                  />
                </div>
              </div>

              {task.due_date && (
                <div className="text-right flex-shrink-0">
                  <p className="text-caption text-muted-soft">
                    {new Date(task.due_date + "T00:00:00").toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-body text-muted">No tasks match your filters</p>
        </div>
      )}
    </div>
  );
}
