'use client';

import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-3 left-3 right-3 sm:top-auto sm:bottom-5 sm:left-auto sm:right-5 z-[100000] flex flex-col gap-2 max-w-md sm:max-w-sm w-auto pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    // Guaranteed auto-fade out at 2.8s, dismiss at 3.2s
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2800);

    const dismissTimer = setTimeout(() => {
      onDismissRef.current(toast.id);
    }, 3200);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast.id]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current && touchEndX.current && Math.abs(touchStartX.current - touchEndX.current) > 30) {
      // Swiped! Dismiss immediately
      setIsFadingOut(true);
      setTimeout(() => onDismissRef.current(toast.id), 200);
    }
  };

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />,
    error: <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />,
    info: <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 shrink-0" />
  };

  const styles = {
    success: 'border-emerald-500/40 bg-zinc-950/95 text-white shadow-emerald-500/10',
    error: 'border-rose-500/40 bg-zinc-950/95 text-white shadow-rose-500/10',
    warning: 'border-amber-500/40 bg-zinc-950/95 text-white shadow-amber-500/10',
    info: 'border-blue-500/40 bg-zinc-950/95 text-white shadow-blue-500/10'
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`pointer-events-auto px-3.5 py-2.5 sm:p-4 rounded-2xl border backdrop-blur-md shadow-2xl flex items-center justify-between gap-3 transform transition-all duration-300 ease-out cursor-pointer ${
        isFadingOut ? 'opacity-0 -translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100 animate-slide-up'
      } ${styles[toast.type]}`}
      onClick={() => {
        setIsFadingOut(true);
        setTimeout(() => onDismissRef.current(toast.id), 200);
      }}
    >
      <div className="flex items-center gap-2.5">
        {icons[toast.type]}
        <div>
          <h5 className="font-extrabold text-[11px] sm:text-xs leading-tight">{toast.title}</h5>
          {toast.message && <p className="text-[10px] sm:text-[11px] text-zinc-300 dark:text-zinc-400 mt-0.5 leading-snug line-clamp-2">{toast.message}</p>}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsFadingOut(true);
          setTimeout(() => onDismissRef.current(toast.id), 200);
        }}
        className="text-zinc-400 hover:text-white cursor-pointer p-1 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
