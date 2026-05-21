"use client";

import { useRef, useEffect, useCallback } from "react";
import { WaveformAnalyzer } from "@/lib/audio";

export function useWaveform(stream: MediaStream | null) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<WaveformAnalyzer | null>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    const analyzer = new WaveformAnalyzer();
    analyzerRef.current = analyzer;
    analyzer.start(stream, canvasRef.current);

    return () => {
      analyzer.stop();
      analyzerRef.current = null;
    };
  }, [stream]);

  const drawStaticWaveform = useCallback((blob: Blob) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const audioContext = new AudioContext();
    const reader = new FileReader();

    reader.onload = async () => {
      const buffer = await audioContext.decodeAudioData(reader.result as ArrayBuffer);
      const data = buffer.getChannelData(0);
      const step = Math.floor(data.length / 128);
      const bars: number[] = [];

      for (let i = 0; i < 128; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += Math.abs(data[i * step + j]);
        }
        bars.push(sum / step);
      }

      const max = Math.max(...bars, 0.01);
      const barWidth = canvas.width / bars.length - 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, "#f54e00");
      gradient.addColorStop(1, "#7c3aed");

      bars.forEach((value, i) => {
        const barHeight = (value / max) * canvas.height * 0.8;
        ctx.fillStyle = gradient;
        ctx.fillRect(
          i * (barWidth + 2),
          canvas.height / 2 - barHeight / 2,
          barWidth,
          barHeight
        );
      });

      audioContext.close();
    };

    reader.readAsArrayBuffer(blob);
  }, []);

  return { canvasRef, drawStaticWaveform };
}
