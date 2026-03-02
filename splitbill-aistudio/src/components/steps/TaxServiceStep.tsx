import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { ReceiptData } from '../../types';

type TaxServiceStepProps = {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  currentBill: ReceiptData | undefined;
  setBills: (bills: ReceiptData[]) => void;
  bills: ReceiptData[];
  setStep: (step: any) => void;
  formatCurrency: (amount: number) => string;
  taxPercentage: string;
  setTaxPercentage: (val: string) => void;
  servicePercentage: string;
  setServicePercentage: (val: string) => void;
};

export const TaxServiceStep: React.FC<TaxServiceStepProps> = ({ 
  darkMode, setDarkMode, currentBill, setBills, bills, setStep, formatCurrency, taxPercentage, setTaxPercentage, servicePercentage, setServicePercentage 
}) => {
  if (!currentBill) return null;

  const subtotal = currentBill.items.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const taxAmount = subtotal * (parseFloat(taxPercentage) / 100);
  const serviceAmount = subtotal * (parseFloat(servicePercentage) / 100);
  const total = subtotal + taxAmount + serviceAmount;

  const handleNext = () => {
    setBills(bills.map(b => b.id === currentBill.id ? { ...b, subtotal, tax: taxAmount, serviceCharge: serviceAmount, total } : b));
    setStep('PAYMENTS');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full dark:bg-gray-950"
    >
      <div className="p-4 flex justify-between items-center">
        <button onClick={() => setStep('ASSIGN_ITEMS')} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          <ChevronLeft size={20} />
        </button>
        <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Pajak & Layanan</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Sesuaikan persentase pajak dan biaya layanan.</p>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px]">Pajak (%)</span>
              <div className="flex items-center space-x-2">
                <input 
                  type="number"
                  value={taxPercentage === '0' ? '' : taxPercentage}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setTaxPercentage(e.target.value || '0')}
                  className="w-16 bg-gray-50 dark:bg-gray-800 py-1.5 px-3 rounded-lg text-right font-black text-indigo-600 dark:text-indigo-400 focus:outline-none text-sm placeholder-gray-300 dark:placeholder-gray-600"
                />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px]">Layanan (%)</span>
              <div className="flex items-center space-x-2">
                <input 
                  type="number"
                  value={servicePercentage === '0' ? '' : servicePercentage}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setServicePercentage(e.target.value || '0')}
                  className="w-16 bg-gray-50 dark:bg-gray-800 py-1.5 px-3 rounded-lg text-right font-black text-indigo-600 dark:text-indigo-400 focus:outline-none text-sm placeholder-gray-300 dark:placeholder-gray-600"
                />
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 dark:shadow-none space-y-3">
            <div className="flex justify-between items-center opacity-80 text-sm">
              <span className="font-bold">Subtotal</span>
              <span className="font-bold">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center opacity-80 text-sm">
              <span className="font-bold">Pajak ({taxPercentage}%)</span>
              <span className="font-bold">+{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between items-center opacity-80 text-sm">
              <span className="font-bold">Layanan ({servicePercentage}%)</span>
              <span className="font-bold">+{formatCurrency(serviceAmount)}</span>
            </div>
            <div className="pt-3 border-t border-white/20 flex justify-between items-center">
              <span className="text-sm font-black uppercase tracking-widest">Total Akhir</span>
              <span className="text-2xl font-black">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={handleNext}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          <span>Lanjut ke Pembayaran</span>
          <ChevronRight size={20} />
        </button>
      </div>
    </motion.div>
  );
};
