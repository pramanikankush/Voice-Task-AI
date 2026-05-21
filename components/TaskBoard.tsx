"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import type { Task, TaskStatus } from "@/types/task";
import { TaskBadges } from "./TaskBadges";
import { updateTaskStatus } from "@/app/actions/extract-tasks";

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

type SortableTaskCardProps = {
  task: Task;
  isDragging?: boolean;
};

function SortableTaskCard({ task, isDragging }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="card p-4 cursor-grab active:cursor-grabbing space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-display text-title-sm text-ink">{task.title}</h4>
      </div>
      {task.description && (
        <p className="text-body-sm text-body line-clamp-2">{task.description}</p>
      )}
      {task.due_date && (
        <p className="text-caption text-muted-soft">
          Due: {new Date(task.due_date + "T00:00:00").toLocaleDateString()}
        </p>
      )}
      <TaskBadges priority={task.priority} category={task.category} tags={task.tags} />
    </div>
  );
}

type ColumnProps = {
  column: { id: TaskStatus; label: string };
  tasks: Task[];
};

function Column({ column, tasks }: ColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });
  const taskIds = tasks.map((t) => t.id);

  return (
    <div ref={setNodeRef} className="flex-1 min-w-[280px] space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-display text-title-md text-ink">{column.label}</h3>
        <span className="badge-pill">{tasks.length}</span>
      </div>
      <div className="space-y-3 min-h-[200px] p-1">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <SortableTaskCard task={task} />
            </motion.div>
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

type TaskBoardProps = {
  tasks: Task[];
  onTasksChange: () => void;
};

export function TaskBoard({ tasks, onTasksChange }: TaskBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overColumn = COLUMNS.find(
      (c) => c.id === over.id || tasks.some((t) => t.id === over.id && t.status === c.id)
    );

    if (!overColumn) return;

    if (activeTask.status !== overColumn.id) {
      updateTaskStatus(activeTask.id, overColumn.id);
      onTasksChange();
    }
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            column={col}
            tasks={tasks.filter((t) => t.status === col.id)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="card p-4 space-y-2 shadow-lg rotate-3">
            <h4 className="font-display text-title-sm text-ink">{activeTask.title}</h4>
            <TaskBadges
              priority={activeTask.priority}
              category={activeTask.category}
              tags={activeTask.tags}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
