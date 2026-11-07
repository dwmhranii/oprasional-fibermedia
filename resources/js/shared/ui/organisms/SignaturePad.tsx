import React, { useRef, useState, useEffect } from 'react';
import { Button, ComponentDensity } from '../atoms';
import { RotateCcw, Check, PenTool } from 'lucide-react';

export interface SignaturePadProps {
  signerName: string;
  signerRole?: string;
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  density?: ComponentDensity;
  className?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  signerName,
  signerRole = 'Pelanggan',
  onSave,
  onClear,
  density = 'comfortable',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high DPI display canvas scaling
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = '#0891b2'; // Fiber cyan/teal signature line
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    const mouseEvent = e as React.MouseEvent;
    return {
      x: mouseEvent.clientX - rect.left,
      y: mouseEvent.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    if (onClear) onClear();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className={`space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <PenTool className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-sm font-semibold text-foreground">Tanda Tangan Digital</h5>
            <p className="text-xs text-muted-foreground">
              {signerName} ({signerRole})
            </p>
          </div>
        </div>

        {hasSignature && (
          <Button
            variant="ghost"
            size="sm"
            density="compact"
            onClick={handleClear}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Hapus
          </Button>
        )}
      </div>

      {/* Canvas Box */}
      <div className="relative w-full h-44 rounded-xl border-2 border-dashed border-border bg-muted/20 overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair"
        />

        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/60 text-xs">
            Bubuhkan tanda tangan di sini
          </div>
        )}

        {/* Base guideline line */}
        <div className="absolute bottom-6 left-6 right-6 border-b border-muted-foreground/20 pointer-events-none" />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          variant="primary"
          size="md"
          density={density}
          disabled={!hasSignature}
          onClick={handleSave}
          leftIcon={<Check className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          Konfirmasi Tanda Tangan
        </Button>
      </div>
    </div>
  );
};

