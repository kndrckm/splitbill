import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

type ProcessingStepProps = {
  receiptImage: string | null;
};

export const ProcessingStep: React.FC<ProcessingStepProps> = ({ receiptImage }) => (
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
      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Uploading & Reading the Data</h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm mt-3 max-w-[240px] mx-auto leading-relaxed">Ini pakai Gemini buat baca text dari nota brok.</p>
    </div>
  </motion.div>
);
