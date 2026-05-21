"use client";

type RecordingTimerProps = {
  displayTime: string;
  displayRemaining: string;
  isRecording: boolean;
};

export function RecordingTimer({
  displayTime,
  displayRemaining,
  isRecording,
}: RecordingTimerProps) {
  return (
    <div className="flex items-center gap-3 font-mono text-sm">
      {isRecording && (
        <span className="w-2 h-2 rounded-full bg-semantic-error recording-pulse" />
      )}
      <span className="text-ink tabular-nums">{displayTime}</span>
      <span className="text-muted">/</span>
      <span className="text-muted-soft tabular-nums">{displayRemaining}</span>
    </div>
  );
}
