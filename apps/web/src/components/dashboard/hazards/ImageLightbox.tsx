/**
 * ImageLightbox - Full-screen image viewer with zoom controls
 * Vision UI glassmorphism design with dark/light theme support
 */
import React, { useState, useCallback, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Maximize2 } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface ImageLightboxProps {
  src: string;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const ImageLightbox = React.memo<ImageLightboxProps>(
  ({ src, alt = 'Image', isOpen, onClose }) => {
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);

    // Reset on close
    useEffect(() => {
      if (!isOpen) {
        setScale(1);
        setRotation(0);
      }
    }, [isOpen]);

    // Handle keyboard events
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return;

        switch (e.key) {
          case 'Escape':
            onClose();
            break;
          case '+':
          case '=':
            setScale((s) => Math.min(s + 0.25, 4));
            break;
          case '-':
            setScale((s) => Math.max(s - 0.25, 0.25));
            break;
          case 'r':
            setRotation((r) => (r + 90) % 360);
            break;
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Zoom controls
    const zoomIn = useCallback(() => setScale((s) => Math.min(s + 0.25, 4)), []);
    const zoomOut = useCallback(() => setScale((s) => Math.max(s - 0.25, 0.25)), []);
    const rotate = useCallback(() => setRotation((r) => (r + 90) % 360), []);
    const resetView = useCallback(() => {
      setScale(1);
      setRotation(0);
    }, []);

    // Download image
    const downloadImage = useCallback(async () => {
      try {
        const response = await fetch(src);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analysis-photo-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to download image:', err);
      }
    }, [src]);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          onClick={onClose}
          role="button"
          aria-label="Close lightbox"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onClose();
          }}
        />

        {/* Controls Bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
          <button
            type="button"
            onClick={zoomOut}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Zoom Out (-)"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-5 h-5 text-white" aria-hidden="true" />
          </button>
          <span className="text-sm text-white/70 min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Zoom In (+)"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-5 h-5 text-white" aria-hidden="true" />
          </button>
          <div className="w-px h-6 bg-white/20 mx-1" />
          <button
            type="button"
            onClick={rotate}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Rotate (R)"
            aria-label="Rotate image"
          >
            <RotateCw className="w-5 h-5 text-white" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={resetView}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Reset View"
            aria-label="Reset view"
          >
            <Maximize2 className="w-5 h-5 text-white" aria-hidden="true" />
          </button>
          <div className="w-px h-6 bg-white/20 mx-1" />
          <button
            type="button"
            onClick={downloadImage}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Download"
            aria-label="Download image"
          >
            <Download className="w-5 h-5 text-white" aria-hidden="true" />
          </button>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          title="Close (Esc)"
          aria-label="Close lightbox"
        >
          <X className="w-6 h-6 text-white" aria-hidden="true" />
        </button>

        {/* Image Container */}
        <div className="relative max-w-[90vw] max-h-[85vh] overflow-hidden">
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-[85vh] object-contain transition-transform duration-200"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
            }}
            draggable={false}
          />
        </div>

        {/* Keyboard Hints */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/50">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 mx-0.5">Esc</kbd> to close,
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 mx-0.5">+/-</kbd> to zoom,
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 mx-0.5">R</kbd> to rotate
        </div>
      </div>
    );
  }
);

ImageLightbox.displayName = 'ImageLightbox';

export default ImageLightbox;
