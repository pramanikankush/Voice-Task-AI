"use client";

import { useRef, useCallback, useEffect } from "react";
import { WaveformAnalyzer } from "@/lib/audio";

type WaveformCanvasProps = {
  stream: MediaStream | null;
  audioBlob: Blob | null;
  isRecording: boolean;
};

export function WaveformCanvas({ stream, audioBlob, isRecording }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<WaveformAnalyzer | null>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) {
      if (!isRecording && canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
      return;
    }

    const analyzer = new WaveformAnalyzer();
    analyzerRef.current = analyzer;
    analyzer.start(stream, canvasRef.current);

    return () => {
      analyzer.stop();
      analyzerRef.current = null;
    };
  }, [stream, isRecording]);

  const drawStaticWaveform = useCallback(async (blob: Blob) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const audioCtx = new AudioContext();
    const buffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(buffer);
    const data = audioBuffer.getChannelData(0);
    const bars = 128;
    const step = Math.floor(data.length / bars);
    const amplitudes: number[] = [];

    for (let i = 0; i < bars; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += Math.abs(data[i * step + j]);
      }
      amplitudes.push(sum / step);
    }

    const max = Math.max(...amplitudes, 0.01);
    const barWidth = canvas.width / bars - 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, "#f54e00");
    gradient.addColorStop(1, "#7c3aed");

    amplitudes.forEach((val, i) => {
      const h = (val / max) * canvas.height * 0.8;
      ctx.fillStyle = gradient;
      ctx.fillRect(i * (barWidth + 2), canvas.height / 2 - h / 2, barWidth, h);
    });

    audioCtx.close();
  }, []);

  useEffect(() => {
    if (audioBlob && !isRecording) {
      drawStaticWaveform(audioBlob);
    }
  }, [audioBlob, isRecording, drawStaticWaveform]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={80}
      className="w-full h-20 rounded-lg"
    />
  );
}
