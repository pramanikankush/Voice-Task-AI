"use client";

import { motion } from "framer-motion";
import type { Task } from "@/types/task";

type TranscriptPanelProps = {
  transcript: string;
  tasks: Task[];
  isVisible: boolean;
};

export function TranscriptPanel({ transcript, tasks, isVisible }: TranscriptPanelProps) {
  if (!isVisible || !transcript) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="card p-6 space-y-4"
    >
      <h3 className="font-display text-title-md text-ink">Transcript</h3>
      <p className="text-body text-body">{transcript}</p>

      {tasks.length > 0 && (
        <div className="pt-4 border-t border-hairline space-y-2">
          <h4 className="font-display text-title-sm text-ink">
            Extracted Tasks ({tasks.length})
          </h4>
          <ul className="space-y-1">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2 text-body-sm text-body">
                <span className="w-1.5 h-1.5 rounded-full bg-semantic-success flex-shrink-0" />
                {task.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
