"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSupabase } from "@/lib/supabase/client";
import type { Recording } from "@/types/task";
import { extractTasks } from "@/app/actions/extract-tasks";

type RecordingHistoryProps = {
  refreshTrigger: number;
  onReExtract: () => void;
};

function WaveformThumbnail() {
  const [bars, setBars] = useState<{height: number; opacity: number}[]>([]);

  useEffect(() => {
    setBars(
      Array.from({ length: 20 }, () => ({
        height: 20 + Math.floor(Math.random() * 60),
        opacity: 0.6 + Math.random() * 0.4,
      }))
    );
  }, []);

  return (
    <div className="flex items-end gap-[2px] h-8 w-24">
      {bars.map((bar, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-gradient-to-t from-primary to-timeline-edit"
          style={{
            height: `${bar.height}%`,
            opacity: bar.opacity,
          }}
        />
      ))}
    </div>
  );
}

export function RecordingHistory({ refreshTrigger, onReExtract }: RecordingHistoryProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reExtracting, setReExtracting] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecordings = async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("recordings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) setRecordings(data as Recording[]);
    };

    fetchRecordings();
  }, [refreshTrigger]);

  const handleReExtract = async (recording: Recording) => {
    if (!recording.transcript) return;
    setReExtracting(recording.id);
    await extractTasks(recording.transcript, recording.id);
    setReExtracting(null);
    onReExtract();
  };

  return (
    <div className="space-y-3">
      <h2 className="font-display text-display-sm text-ink">Recording History</h2>
      <AnimatePresence>
        {recordings.map((rec) => (
          <motion.div
            key={rec.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-4 space-y-3"
          >
            <button
              onClick={() =>
                setExpandedId(expandedId === rec.id ? null : rec.id)
              }
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <WaveformThumbnail />
                <div className="text-left">
                  <p className="text-body-sm text-muted">
                    {new Date(rec.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-caption text-muted-soft">
                    {rec.duration_seconds}s
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {rec.audio_url && (
                  <audio controls className="h-8 w-32">
                    <source src={rec.audio_url} type="audio/webm" />
                  </audio>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReExtract(rec);
                  }}
                  disabled={reExtracting === rec.id}
                  className="btn-tertiary text-xs"
                >
                  {reExtracting === rec.id ? "..." : "Re-extract"}
                </button>
              </div>
            </button>

            {expandedId === rec.id && rec.transcript && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="pt-3 border-t border-hairline"
              >
                <p className="text-body-sm text-body">{rec.transcript}</p>
              </motion.div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
