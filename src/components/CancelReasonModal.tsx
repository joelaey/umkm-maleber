'use client';

import React, { useState } from 'react';
import { XCircle, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CancelReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onConfirmCancel: (reason: string) => void;
}

const PRESET_REASONS = [
  'Salah pilih titik lokasi / alamat pengantaran',
  'Driver / Toko terlalu lama merespons',
  'Ingin mengubah menu pesanan / rute',
  'Ingin mengganti metode pembayaran',
  'Lainnya (alasan kustom)'
];

export default function CancelReasonModal({
  isOpen,
  onClose,
  title,
  onConfirmCancel
}: CancelReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason =
      selectedReason === 'Lainnya (alasan kustom)' && customReason.trim()
        ? customReason.trim()
        : selectedReason;

    setIsSubmitting(true);
    setTimeout(() => {
      onConfirmCancel(finalReason);
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 modal-overlay"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 space-y-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 modal-content relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white">Alasan Pembatalan</h3>
              <p className="text-xs text-zinc-500">{title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
            Mengapa Anda membatalkan pesanan ini?
          </label>

          <div className="space-y-2">
            {PRESET_REASONS.map((reason, idx) => (
              <label
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  selectedReason === reason
                    ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 font-bold'
                    : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100'
                }`}
              >
                <input
                  type="radio"
                  name="cancel_reason"
                  checked={selectedReason === reason}
                  onChange={() => setSelectedReason(reason)}
                  className="accent-rose-600"
                />
                <span>{reason}</span>
              </label>
            ))}
          </div>

          {selectedReason === 'Lainnya (alasan kustom)' && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Tuliskan alasan pembatalan Anda..."
              rows={3}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-zinc-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              required
            />
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-xs font-extrabold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 text-xs font-black rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? 'Memproses...' : 'Ya, Batalkan Pesanan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
