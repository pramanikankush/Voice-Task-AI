"use client";

import { useState, useRef, useCallback } from "react";
import { AudioRecorder, formatDuration } from "@/lib/audio";
import type { RecorderState } from "@/types/task";

type UseRecorderOptions = {
  maxDurationMs?: number;
};

export function useRecorder({ maxDurationMs = 300000 }: UseRecorderOptions = {}) {
  const [state, setState] = useState<RecorderState>("idle");
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(() => {
    setAudioBlob(null);
    setState("recording");

    recorderRef.current = new AudioRecorder({
      maxDurationMs,
      onChunk: () => {},
      onStop: (blob) => {
        setAudioBlob(blob);
        setState("done");
        if (durationInterval.current) {
          clearInterval(durationInterval.current);
          durationInterval.current = null;
        }
      },
      onError: () => {
        setState("idle");
        if (durationInterval.current) {
          clearInterval(durationInterval.current);
          durationInterval.current = null;
        }
      },
    });

    recorderRef.current.start();

    durationInterval.current = setInterval(() => {
      setDuration(Math.floor((recorderRef.current?.elapsedMs ?? 0) / 1000));
    }, 200);
  }, [maxDurationMs]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    setState("processing");
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
  }, []);

  const resetRecording = useCallback(() => {
    setState("idle");
    setDuration(0);
    setAudioBlob(null);
  }, []);

  const displayTime = formatDuration(duration);
  const remaining = Math.max(0, Math.floor((maxDurationMs - duration * 1000) / 1000));
  const displayRemaining = formatDuration(remaining);

  return {
    state,
    setState,
    duration,
    displayTime,
    remaining,
    displayRemaining,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
