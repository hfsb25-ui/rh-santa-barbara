import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCw, Check, X } from "lucide-react";

interface Props {
  onCapture: (dataUrl: string) => void;
  onCancel?: () => void;
}

export function SelfieCapture({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setError(null);
    setCaptured(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
        setReady(true);
      }
    } catch (e) {
      setError(
        "Não foi possível acessar a câmera. Permita o acesso e tente novamente.",
      );
    }
  }
  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function tirar() {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const vw = v.videoWidth || 640;
    const vh = v.videoHeight || 480;

    // Recorta em formato oval (rosto) centralizado
    // Define um retângulo de recorte vertical 3:4 centralizado
    const cropH = vh;
    const cropW = Math.round(cropH * 0.75); // 3:4
    const cropX = Math.round((vw - cropW) / 2);
    const cropY = 0;

    const outW = 480;
    const outH = 640;

    const c = document.createElement("canvas");
    c.width = outW;
    c.height = outH;
    const ctx = c.getContext("2d")!;

    // Fundo transparente
    ctx.clearRect(0, 0, outW, outH);

    // Máscara oval
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(outW / 2, outH / 2, outW / 2, outH / 2, 0, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Espelha (selfie)
    ctx.translate(outW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
    ctx.restore();

    const url = c.toDataURL("image/png");
    setCaptured(url);
    stop();
  }

  function confirmar() {
    if (captured) onCapture(captured);
  }

  function refazer() {
    setCaptured(null);
    start();
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="relative overflow-hidden rounded-lg border bg-black aspect-[3/4] max-w-sm mx-auto flex items-center justify-center">
        {captured ? (
          <img src={captured} alt="Selfie" className="w-full h-full object-contain bg-muted" />
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
              playsInline
              muted
            />
            {/* Overlay com guia oval para enquadrar o rosto */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 300 400"
              preserveAspectRatio="none"
            >
              <defs>
                <mask id="oval-mask">
                  <rect width="300" height="400" fill="white" />
                  <ellipse cx="150" cy="200" rx="120" ry="160" fill="black" />
                </mask>
              </defs>
              <rect width="300" height="400" fill="rgba(0,0,0,0.55)" mask="url(#oval-mask)" />
              <ellipse
                cx="150"
                cy="200"
                rx="120"
                ry="160"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeDasharray="6 6"
              />
            </svg>
            <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white drop-shadow">
              Posicione seu rosto dentro do oval
            </p>
          </>
        )}
      </div>
      <div className="flex gap-2">
        {!captured ? (
          <>
            <Button
              type="button"
              onClick={tirar}
              disabled={!ready}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Capturar selfie
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={refazer}
              className="flex-1"
            >
              <RotateCw className="w-4 h-4 mr-2" /> Refazer
            </Button>
            <Button type="button" onClick={confirmar} className="flex-1">
              <Check className="w-4 h-4 mr-2" /> Usar esta selfie
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
