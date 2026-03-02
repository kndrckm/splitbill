import React from 'react';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';

type RestoreStepProps = {
  pendingState: any;
  setBills: (bills: any[]) => void;
  setPeople: (people: any[]) => void;
  setPayments: (payments: any[]) => void;
  setStep: (step: any) => void;
  setCurrentBillId: (id: string | null) => void;
  setIsInitialized: (val: boolean) => void;
};

export const RestoreStep: React.FC<RestoreStepProps> = ({ 
  pendingState, setBills, setPeople, setPayments, setStep, setCurrentBillId, setIsInitialized 
}) => (
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
        onClick={() => {
          if (pendingState) {
            setBills(pendingState.bills || []);
            setPeople(pendingState.people || []);
            setPayments(pendingState.payments || []);
            if (pendingState.step) setStep(pendingState.step);
            if (pendingState.currentBillId) setCurrentBillId(pendingState.currentBillId);
          }
          setIsInitialized(true);
        }}
        className="w-full bg-white text-indigo-600 font-black py-5 px-6 rounded-2xl shadow-xl active:scale-95 transition-all text-lg"
      >
        Lanjutkan Sesi
      </button>
      <button
        onClick={() => {
          localStorage.removeItem('splitbill_state');
          setBills([]);
          setPeople([]);
          setPayments([]);
          setCurrentBillId(null);
          setStep('UPLOAD');
          setIsInitialized(true);
        }}
        className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-5 px-6 rounded-2xl transition-all active:scale-95 text-lg"
      >
        Mulai Baru
      </button>
    </div>
  </motion.div>
);
