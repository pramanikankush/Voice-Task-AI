"use client";

import { useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Recorder } from "@/components/Recorder";
import { TaskBoard } from "@/components/TaskBoard";
import { TaskList } from "@/components/TaskList";
import { TaskCalendar } from "@/components/TaskCalendar";
import { FilterBar } from "@/components/FilterBar";
import { SearchInput } from "@/components/SearchInput";
import { RecordingHistory } from "@/components/RecordingHistory";
import { useRealtimeTasks } from "@/hooks/useRealtimeTasks";
import { filterTasks, getCategories, getTags } from "@/lib/filters";
import type { ViewMode, FilterState } from "@/types/task";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { tasks } = useRealtimeTasks([], refreshTrigger);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filters, setFilters] = useState<FilterState>({
    category: null,
    priority: null,
    dateRange: { from: null, to: null },
    tag: null,
    search: "",
  });

  const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";

  const filteredTasks = useMemo(
    () => filterTasks(tasks, filters),
    [tasks, filters]
  );

  const categories = useMemo(() => getCategories(tasks), [tasks]);
  const tags = useMemo(() => getTags(tasks), [tasks]);

  const handleTasksChange = useCallback(() => {
    setRefreshTrigger((n) => n + 1);
  }, []);

  return (
    <div className="space-y-section">
      <div className="space-y-2">
        <h1 className="font-display text-display-lg text-ink">Voice Memos to Tasks</h1>
        <p className="text-body text-body max-w-xl">
          Record a voice memo, and AI will transcribe and extract actionable tasks.
        </p>
      </div>

      <Recorder userId={MOCK_USER_ID} onTasksExtracted={handleTasksChange} />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-display-sm text-ink">Tasks</h2>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-strong">
            {(["list", "kanban", "calendar"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                suppressHydrationWarning
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === mode
                    ? "bg-surface-card text-ink shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="w-full sm:w-64">
            <SearchInput
              value={filters.search}
              onChange={(search) => setFilters((f) => ({ ...f, search }))}
            />
          </div>
          <FilterBar
            filters={filters}
            onChange={setFilters}
            categories={categories}
            tags={tags}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {viewMode === "kanban" && (
              <TaskBoard tasks={filteredTasks} onTasksChange={handleTasksChange} />
            )}
            {viewMode === "list" && (
              <TaskList tasks={filteredTasks} onTasksChange={handleTasksChange} />
            )}
            {viewMode === "calendar" && <TaskCalendar tasks={filteredTasks} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <RecordingHistory
        refreshTrigger={refreshTrigger}
        onReExtract={handleTasksChange}
      />
    </div>
  );
}
