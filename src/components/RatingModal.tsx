'use client';

import React, { useState } from 'react';
import { Star, MessageSquare, Utensils, Store, Bike, CheckCircle2, ChevronRight } from 'lucide-react';

export interface RatingStep {
  targetId: string;
  targetName: string;
  targetType: 'store' | 'driver' | 'product';
  subtitle?: string;
}

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName?: string;
  targetType?: 'store' | 'driver' | 'product';
  targetId?: string;
  steps?: RatingStep[];
  onSubmitRating: (targetId: string, targetType: 'store' | 'driver' | 'product', rating: number, comment: string) => void;
}

const QUICK_TAGS: Record<'store' | 'driver' | 'product', string[]> = {
  driver: ['Driver Ramah', 'Pengantaran Cepat', 'Hati-hati di Jalan', 'Pelayanan Mantap'],
  product: ['Rasa Sangat Lezat', 'Bahan Segar Organik', 'Porsi Melimpah', 'Pengemasan Rapi'],
  store: ['Pelayanan Ramah', 'Harga Terjangkau Maleber', 'Proses Cepat', 'Sangat Recomended']
};

export default function RatingModal({
  isOpen,
  onClose,
  targetName = '',
  targetType = 'store',
  targetId = '',
  steps,
  onSubmitRating
}: RatingModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  if (!isOpen) return null;

  // Determine active item being rated
  const activeStep: RatingStep = steps && steps.length > 0 && steps[currentStepIndex]
    ? steps[currentStepIndex]
    : { targetId, targetName, targetType };

  const totalSteps = steps ? steps.length : 1;
  const isMultiStep = totalSteps > 1;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const resetFormState = () => {
    setRating(5);
    setHoverRating(0);
    setComment('');
    setSelectedTags([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalComment = [selectedTags.join(', '), comment].filter(Boolean).join(' - ');
    
    // Submit review for current target
    onSubmitRating(
      activeStep.targetId,
      activeStep.targetType,
      rating,
      finalComment || 'Pengalaman yang sangat memuaskan!'
    );

    // If there are more steps in multi-step flow (Produk -> Toko -> Driver)
    if (isMultiStep && currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      resetFormState();
    } else {
      // Completed all steps
      resetFormState();
      setCurrentStepIndex(0);
      onClose();
    }
  };

  const typeLabel = activeStep.targetType === 'driver' 
    ? 'Driver Kurir Ojek' 
    : activeStep.targetType === 'product' 
    ? 'Produk / Makanan' 
    : 'Toko / Resto UMKM';

  const Icon = activeStep.targetType === 'driver' ? Bike : activeStep.targetType === 'product' ? Utensils : Store;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
      <div 
        className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-center modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Multi-step Header & Progress Bar */}
        {isMultiStep && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-black text-amber-600 dark:text-amber-400">
              <span className="flex items-center gap-1">
                Langkah {currentStepIndex + 1} dari {totalSteps}
              </span>
              <span className="text-[11px] font-bold text-zinc-400">
                {activeStep.targetType === 'product' ? '1. Rating Produk' : activeStep.targetType === 'store' ? '2. Rating Resto' : '3. Rating Driver'}
              </span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-amber-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-500 flex items-center justify-center mx-auto shadow-md">
          <Icon className="w-7 h-7 text-amber-500" />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-300/40 uppercase tracking-wider">
            Rating &amp; Ulasan {typeLabel}
          </span>
          <h3 className="text-xl font-black text-zinc-900 dark:text-white mt-1">
            {activeStep.targetType === 'product' ? 'Beri Rating Makanan' : activeStep.targetType === 'store' ? 'Beri Rating Toko UMKM' : 'Beri Rating Driver Kurir'}
          </h3>
          <p className="text-xs text-zinc-500">
            Bagaimana kualitas dari <span className="font-bold text-zinc-800 dark:text-zinc-200">{activeStep.targetName}</span>?
          </p>
        </div>

        {/* Interactive Star Rating Selector */}
        <div className="space-y-1">
          <div className="flex justify-center items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating || rating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-125 cursor-pointer"
                >
                  <Star
                    className={`w-9 h-9 ${
                      active
                        ? 'fill-amber-400 text-amber-400 drop-shadow-md'
                        : 'text-zinc-300 dark:text-zinc-700'
                    }`}
                  />
                </button>
              );
            })}
          </div>
          <span className="text-xs font-black text-amber-500 block">
            {rating === 5 ? 'Sangat Memuaskan (5/5)' : rating === 4 ? 'Bagus & Puas (4/5)' : rating === 3 ? 'Cukup Baik (3/5)' : 'Perlu Ditingkatkan (2/5)'}
          </span>
        </div>

        {/* Quick Tag Pills */}
        <div className="space-y-1.5 text-left">
          <span className="text-[11px] font-bold text-zinc-500 block">Pilih Catatan Cepat (Opsional):</span>
          <div className="flex flex-wrap gap-1.5">
            {(QUICK_TAGS[activeStep.targetType] || []).map((tag, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer border ${
                  selectedTags.includes(tag)
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Tulis Komentar / Ulasan Lengkap:</label>
            <textarea
              placeholder={`Tulis kesan, komentar, atau saran untuk ${activeStep.targetName}...`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-3 text-xs text-zinc-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 text-xs font-bold rounded-2xl text-zinc-500 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 cursor-pointer"
            >
              Lompati
            </button>
            <button
              type="submit"
              className="flex-1 py-3 text-xs font-black rounded-2xl text-zinc-950 bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-400/20 cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              {isMultiStep && currentStepIndex < totalSteps - 1 ? (
                <>
                  Lanjut Ke Step Berikutnya <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Kirim Seluruh Ulasan
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
