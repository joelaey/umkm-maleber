'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Check, Upload, Image as ImageIcon } from 'lucide-react';

export const DEFAULT_BLANK_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="%23E4E4E7"/><path d="M64 64C74.4934 64 83 55.4934 83 45C83 34.5066 74.4934 26 64 26C53.5066 26 45 34.5066 45 45C45 55.4934 53.5066 64 64 64ZM64 74C49.9706 74 26 81.0294 26 95V102H102V95C102 81.0294 78.0294 74 64 74Z" fill="%23A1A1AA"/></svg>`;

interface AvatarCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImage?: string;
  onCropComplete: (croppedDataUrl: string) => void;
}

export default function AvatarCropModal({
  isOpen,
  onClose,
  initialImage,
  onCropComplete
}: AvatarCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string>(initialImage || DEFAULT_BLANK_AVATAR);
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialImage) {
      setImageSrc(initialImage);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [initialImage, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageSrc(reader.result);
          setScale(1);
          setPosition({ x: 0, y: 0 });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleCropAndSave = () => {
    const canvas = document.createElement('canvas');
    const size = 300;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx || !imageRef.current) return;

    // Draw circular clip path
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Fill background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    const img = imageRef.current;
    const cropSize = 220; // Size of circular crop frame on screen

    // Calculate source and target coordinates
    const scaleFactor = img.naturalWidth / (img.width || cropSize);
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;

    const dx = (size - drawWidth) / 2 + (position.x * size) / cropSize;
    const dy = (size - drawHeight) / 2 + (position.y * size) / cropSize;

    ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

    const croppedUrl = canvas.toDataURL('image/jpeg', 0.9);
    onCropComplete(croppedUrl);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 modal-overlay overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 text-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-zinc-800 modal-content relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              📸
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Atur &amp; Potong Foto Profil</h3>
              <p className="text-[11px] text-zinc-400">Geser &amp; atur ukuran lingkaran profil (WhatsApp Style)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Circular Crop Frame Area */}
        <div className="relative w-full aspect-square max-w-[260px] mx-auto bg-black rounded-3xl overflow-hidden border border-zinc-800 shadow-inner flex items-center justify-center select-none cursor-grab active:cursor-grabbing">
          {/* Draggable Background Image */}
          <div
            ref={containerRef}
            className="absolute inset-0 flex items-center justify-center"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Avatar preview"
              className="max-w-none transition-transform duration-75 pointer-events-none"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                width: '200px',
                height: 'auto'
              }}
            />
          </div>

          {/* WhatsApp / Instagram Style Circular Overlay Mask */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-52 h-52 rounded-full border-2 border-emerald-500 ring-[9999px] ring-black/75 shadow-2xl flex items-center justify-center">
              <span className="text-[10px] font-bold text-white/50 tracking-wider uppercase pointer-events-none select-none">
                Area Foto Profil
              </span>
            </div>
          </div>
        </div>

        {/* Controls: Zoom Slider & Upload File */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-3 bg-zinc-800/60 p-3 rounded-2xl border border-zinc-800">
            <ZoomOut className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              type="range"
              min={0.8}
              max={3}
              step={0.05}
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-zinc-400 shrink-0" />
          </div>

          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs py-3 rounded-2xl border border-zinc-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              Pilih Foto Galeri
            </button>
            <button
              type="button"
              onClick={() => {
                setImageSrc(DEFAULT_BLANK_AVATAR);
                setScale(1);
                setPosition({ x: 0, y: 0 });
              }}
              className="px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-2xl border border-zinc-700 cursor-pointer"
              title="Ganti ke Default Avatar"
            >
              Gunakan Default
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleCropAndSave}
            className="px-5 py-2.5 rounded-2xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 cursor-pointer shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            ✓ Potong &amp; Gunakan Foto
          </button>
        </div>
      </div>
    </div>
  );
}
