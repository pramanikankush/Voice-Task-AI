"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { fetchTasks } from "@/app/actions/extract-tasks";
import type { Task } from "@/types/task";

export function useRealtimeTasks(initialTasks: Task[] = [], refreshTrigger?: number) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // Fetch existing tasks on mount and when refreshTrigger changes
  useEffect(() => {
    async function loadTasks() {
      const res = await fetchTasks();
      if (res.tasks) {
        setTasks(res.tasks as Task[]);
      }
    }
    loadTasks();
  }, [refreshTrigger]);

  // Subscribe to realtime changes
  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        (payload) => {
          const event = payload.eventType;
          const record = payload.new as Task | null;
          const old = payload.old as Task | null;

          setTasks((prev) => {
            switch (event) {
              case "INSERT":
                if (record && !prev.some((t) => t.id === record.id)) {
                  return [record, ...prev];
                }
                return prev;
              case "UPDATE":
                if (record) {
                  return prev.map((t) =>
                    t.id === record.id ? record : t
                  );
                }
                return prev;
              case "DELETE":
                if (old) {
                  return prev.filter((t) => t.id !== old.id);
                }
                return prev;
              default:
                return prev;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateTaskOptimistic = useCallback(
    (taskId: string, updates: Partial<Task>) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
      );
    },
    []
  );

  return { tasks, setTasks, updateTaskOptimistic };
}
