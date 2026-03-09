import React from 'react';
import { motion } from 'motion/react';
import { RefreshCw, Save } from 'lucide-react';
import { AppState } from '../../types';

type RestoreStepProps = {
  pendingState: AppState | null;
  onRestore: (state: AppState) => void;
  onReset: () => void;
};

export const RestoreStep: React.FC<RestoreStepProps> = ({ pendingState, onRestore, onReset }) => {
  const [saved, setSaved] = React.useState(false);

  const handleReset = () => {
    // Save current pending state to a timestamped key so remote Firebase session stays intact
    if (pendingState) {
      try {
        const key = `splitbill_saved_${Date.now()}`;
        localStorage.setItem(key, JSON.stringify(pendingState));
        setSaved(true);
        setTimeout(() => {
          onReset();
        }, 1200);
        return;
      } catch (e) {
        console.error('Failed to archive state', e);
      }
    }
    onReset();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center h-full p-8 text-center space-y-8 bg-indigo-600 dark:bg-indigo-900 text-white"
    >
      <div className="bg-white/20 p-6 rounded-full backdrop-blur-lg">
        <RefreshCw size={48} className="text-white animate-spin-slow" />
      </div>
      <div className="space-y-3">
        <h2 className="text-3xl font-black">Sesi Ditemukan!</h2>
        <p className="text-indigo-100 text-lg">Kami menemukan data pembagian bill yang belum selesai. Apa yang ingin Anda lakukan?</p>
      </div>

      <div className="w-full space-y-4 pt-4">
        <button
          onClick={() => pendingState && onRestore(pendingState)}
          className="w-full bg-white text-indigo-600 font-black py-5 px-6 rounded-2xl shadow-xl active:scale-95 transition-all text-lg"
        >
          Lanjutkan Sesi
        </button>
        <button
          onClick={handleReset}
          disabled={saved}
          className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-5 px-6 rounded-2xl transition-all active:scale-95 text-lg flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {saved ? (
            <>
              <Save size={18} />
              Data disimpan, mereset...
            </>
          ) : (
            'Mulai Baru'
          )}
        </button>
      </div>
    </motion.div>
  );
};
