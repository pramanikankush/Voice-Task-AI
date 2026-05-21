type RecorderOptions = {
  onChunk: (blob: Blob) => void;
  onStop: (blob: Blob) => void;
  onError: (error: Error) => void;
  maxDurationMs?: number;
};

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startTime: number = 0;
  private maxDurationMs: number;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private options: RecorderOptions;

  constructor(options: RecorderOptions) {
    this.options = options;
    this.maxDurationMs = options.maxDurationMs ?? 300000;
  }

  get state(): string {
    return this.mediaRecorder?.state ?? "inactive";
  }

  get elapsedMs(): number {
    if (!this.startTime) return 0;
    return Date.now() - this.startTime;
  }

  async start(): Promise<void> {
    try {
      this.chunks = [];
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
          this.options.onChunk(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: mimeType });
        this.options.onStop(blob);
        this.cleanup();
      };

      this.mediaRecorder.onerror = () => {
        this.options.onError(new Error("MediaRecorder error"));
        this.cleanup();
      };

      this.mediaRecorder.start(1000);
      this.startTime = Date.now();

      if (this.maxDurationMs > 0) {
        this.timerId = setTimeout(() => {
          this.stop();
        }, this.maxDurationMs);
      }
    } catch (error) {
      this.options.onError(error as Error);
    }
  }

  stop(): void {
    if (this.mediaRecorder?.state === "recording") {
      this.mediaRecorder.stop();
    }
  }

  private cleanup(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
  }
}

export class WaveformAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private animationId: number | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;

  async start(stream: MediaStream, canvas: HTMLCanvasElement): Promise<void> {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.source.connect(this.analyser);
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      this.animationId = requestAnimationFrame(draw);
      this.analyser!.getByteTimeDomainData(this.dataArray!);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barCount = 64;
      const barWidth = canvas.width / barCount - 2;
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, "#f54e00");
      gradient.addColorStop(1, "#7c3aed");

      for (let i = 0; i < barCount; i++) {
        const value = this.dataArray![i] / 128.0;
        const barHeight = Math.max(2, value * (canvas.height / 2));

        ctx.fillStyle = gradient;
        ctx.fillRect(
          i * (barWidth + 2),
          canvas.height / 2 - barHeight / 2,
          barWidth,
          barHeight
        );
      }
    };

    draw();
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.dataArray = null;
  }
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
