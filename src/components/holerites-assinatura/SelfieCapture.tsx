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
    const c = document.createElement("canvas");
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    const ctx = c.getContext("2d")!;
    // Espelha para selfie
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", 0.85);
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
      <div className="relative overflow-hidden rounded-lg border bg-black aspect-[4/3] flex items-center justify-center">
        {captured ? (
          <img src={captured} alt="Selfie" className="w-full h-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
            playsInline
            muted
          />
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
