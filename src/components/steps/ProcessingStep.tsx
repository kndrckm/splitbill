import React from 'react';
import { motion } from 'motion/react';
import { Loader2, AlertCircle, RefreshCw, Lightbulb } from 'lucide-react';

type ProcessingStepProps = {
  receiptImage: string | null;
  error?: string | null;
  onRetry?: () => void;
};

export const ProcessingStep: React.FC<ProcessingStepProps> = ({ receiptImage, error, onRetry }) => {
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center h-full p-6 text-center space-y-6 dark:bg-gray-950"
      >
        <div className="bg-red-100 dark:bg-red-900/30 p-5 rounded-full">
          <AlertCircle size={40} className="text-red-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Gagal Membaca Struk</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-[260px] mx-auto leading-relaxed">{error}</p>
        </div>
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-left max-w-[260px]">
          <Lightbulb size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-amber-700 dark:text-amber-400 text-xs leading-relaxed">
            Tips: Foto dengan pencahayaan lebih terang, pastikan seluruh struk terlihat, dan hindari bayangan.
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 bg-indigo-600 text-white font-bold py-3 px-6 rounded-2xl active:scale-95 transition-all shadow-lg shadow-indigo-500/30"
          >
            <RefreshCw size={16} />
            Coba Lagi
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full p-6 text-center space-y-8 dark:bg-gray-950"
    >
      <div className="relative">
        {receiptImage && (
          <div className="relative">
            <img src={receiptImage} alt="Receipt" className="w-56 h-72 object-cover rounded-3xl opacity-40 shadow-2xl grayscale dark:opacity-20" />
            <motion.div
              className="absolute top-0 left-0 right-0 h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)]"
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-2xl">
            <Loader2 size={40} className="text-indigo-600 dark:text-indigo-400 animate-spin" />
          </div>
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Membaca Struk...</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-3 max-w-[240px] mx-auto leading-relaxed">Ini pakai Gemini buat baca text dari nota brok.</p>
      </div>
    </motion.div>
  );
};
