import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  stream?: MediaStream | null;
  isActive: boolean;
  barCount?: number;
  height?: number;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  stream,
  isActive,
  barCount = 28,
  height = 48,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!isActive || !stream) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch {
          // ignore
        }
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = () => {
        animationRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const width = canvas.width;
        const totalBars = Math.min(barCount, bufferLength);
        const barWidth = Math.max(3, (width / totalBars) - 3);
        let x = 0;

        for (let i = 0; i < totalBars; i++) {
          const barHeight = Math.max(4, (dataArray[i] / 255) * canvas.height * 0.9);

          // Gradient color: Indigo to Purple
          const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
          grad.addColorStop(0, '#6366f1'); // Indigo 500
          grad.addColorStop(1, '#a855f7'); // Purple 500

          ctx.fillStyle = grad;
          // Centered vertically
          const y = (canvas.height - barHeight) / 2;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();

          x += barWidth + 3;
        }
      };

      draw();
    } catch (e) {
      console.warn('AudioContext visualization initialization note:', e);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, [stream, isActive, barCount]);

  if (!isActive) {
    return (
      <div className={`flex items-center justify-center gap-1.5 opacity-40 ${className}`} style={{ height }}>
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 bg-slate-700 rounded-full"
            style={{ height: `${Math.sin(i * 0.5) * 8 + 12}px` }}
          />
        ))}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={360}
      height={height}
      className={`w-full max-w-sm rounded-lg ${className}`}
    />
  );
};
