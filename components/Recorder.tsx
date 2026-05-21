"use client";

import { useState, useCallback } from "react";
import { WaveformCanvas } from "./WaveformCanvas";
import { RecordingTimer } from "./RecordingTimer";
import { useRecorder } from "@/hooks/useRecorder";
import { transcribeRecording } from "@/app/actions/transcribe";
import { extractTasks } from "@/app/actions/extract-tasks";

type RecorderProps = {
  userId: string;
  onTasksExtracted: () => void;
};

export function Recorder({ userId, onTasksExtracted }: RecorderProps) {
  const {
    state,
    setState,
    duration,
    audioBlob,
    displayTime,
    displayRemaining,
    startRecording,
    stopRecording,
    resetRecording,
  } = useRecorder({ maxDurationMs: 300000 });

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStart = useCallback(async () => {
    setError("");
    setTranscript("");
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);
      startRecording();
    } catch {
      setError("Microphone access denied");
    }
  }, [startRecording]);

  const handleStop = useCallback(() => {
    stopRecording();
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }, [stopRecording, stream]);

  const handleExtract = useCallback(async () => {
    if (!audioBlob) return;
    setIsProcessing(true);
    setError("");

    const formData = new FormData();
    formData.set("audio", audioBlob);
    formData.set("userId", userId);
    formData.set("duration", String(duration));

    const result = await transcribeRecording(formData);
    if (result.error) {
      setError(result.error);
      setIsProcessing(false);
      return;
    }

    const recordingId = result.recordingId!;
    const transcriptText = result.transcript!;
    setTranscript(transcriptText);

    const extractResult = await extractTasks(transcriptText, recordingId);
    if (extractResult.error) {
      setError(extractResult.error);
    }

    setIsProcessing(false);
    setState("done");
    onTasksExtracted();
  }, [audioBlob, duration, userId, setState, onTasksExtracted]);

  const handleReset = useCallback(() => {
    resetRecording();
    setTranscript("");
    setError("");
    setState("idle");
  }, [resetRecording, setState]);

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-display-sm">Record Memo</h2>
        <RecordingTimer
          displayTime={displayTime}
          displayRemaining={displayRemaining}
          isRecording={state === "recording"}
        />
      </div>

      <WaveformCanvas
        stream={stream}
        audioBlob={audioBlob}
        isRecording={state === "recording"}
      />

      <div className="flex items-center justify-center gap-4">
        {state === "idle" && (
          <button
            onClick={handleStart}
            suppressHydrationWarning
            className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-primary-active transition-colors"
            aria-label="Start recording"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </button>
        )}

        {state === "recording" && (
          <button
            onClick={handleStop}
            suppressHydrationWarning
            className="w-16 h-16 rounded-full bg-semantic-error text-on-primary flex items-center justify-center hover:opacity-90 transition-opacity recording-pulse"
            aria-label="Stop recording"
          >
            <div className="w-6 h-6 rounded-sm bg-white" />
          </button>
        )}

        {(state === "processing" || isProcessing) && (
          <div className="w-16 h-16 rounded-full bg-surface-strong flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {state === "done" && (
          <div className="flex gap-3">
            <button onClick={handleExtract} suppressHydrationWarning className="btn-primary">
              Extract Tasks
            </button>
            <button onClick={handleReset} suppressHydrationWarning className="btn-secondary">
              Discard
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-semantic-error text-center">{error}</p>
      )}

      {transcript && (
        <div className="p-4 rounded-lg bg-canvas-soft border border-hairline">
          <p className="text-sm text-body font-sans">{transcript}</p>
        </div>
      )}
    </div>
  );
}
