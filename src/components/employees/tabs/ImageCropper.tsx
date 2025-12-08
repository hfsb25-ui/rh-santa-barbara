import { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Crop as CropIcon, Check, RotateCcw } from "lucide-react";

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      undefined,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export const ImageCropper = ({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height));
  }, []);

  const getCroppedImage = useCallback(() => {
    if (!imgRef.current || !completedCrop) return;

    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedImageUrl = canvas.toDataURL("image/jpeg", 0.9);
    onCropComplete(croppedImageUrl);
  }, [completedCrop, onCropComplete]);

  return (
    <div className="space-y-4">
      <div className="bg-muted rounded-lg overflow-hidden flex items-center justify-center p-2">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          className="max-h-[60vh]"
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Imagem para recortar"
            onLoad={onImageLoad}
            className="max-h-[60vh] object-contain"
          />
        </ReactCrop>
      </div>
      
      <p className="text-sm text-muted-foreground text-center">
        Arraste os cantos para ajustar a área de recorte
      </p>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Cancelar Recorte
        </Button>
        <Button
          onClick={getCroppedImage}
          disabled={!completedCrop}
          className="flex-1"
        >
          <Check className="w-4 h-4 mr-2" />
          Confirmar Recorte
        </Button>
      </div>
    </div>
  );
};
