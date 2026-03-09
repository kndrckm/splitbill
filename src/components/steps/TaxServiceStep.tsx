import React, { useEffect, useState } from 'react';
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
  taxPercentage: number;
  setTaxPercentage: (val: number) => void;
  servicePercentage: number;
  setServicePercentage: (val: number) => void;
  isInputDisabled?: boolean;
};

export const TaxServiceStep: React.FC<TaxServiceStepProps> = ({
  darkMode, setDarkMode, currentBill, setBills, bills, setStep, formatCurrency,
  taxPercentage, setTaxPercentage, servicePercentage, setServicePercentage, isInputDisabled
}) => {
  const [taxInput, setTaxInput] = useState(taxPercentage === 0 ? '' : String(taxPercentage));
  const [serviceInput, setServiceInput] = useState(servicePercentage === 0 ? '' : String(servicePercentage));

  if (!currentBill) return null;

  // Use AI-extracted subtotal if available, fallback to sum of items
  const subtotal = currentBill.subtotal > 0
    ? currentBill.subtotal
    : currentBill.items.reduce((sum, i) => sum + (i.price * i.qty), 0);

  // Pre-fill percentages from AI-extracted tax/serviceCharge if user hasn't set them yet
  useEffect(() => {
    if (taxPercentage === 0 && currentBill.tax > 0 && subtotal > 0) {
      const pct = Math.round((currentBill.tax / subtotal) * 100 * 100) / 100;
      setTaxPercentage(pct);
      setTaxInput(String(pct));
    }
    if (servicePercentage === 0 && currentBill.serviceCharge > 0 && subtotal > 0) {
      const pct = Math.round((currentBill.serviceCharge / subtotal) * 100 * 100) / 100;
      setServicePercentage(pct);
      setServiceInput(String(pct));
    }
  }, [currentBill.id]);

  const taxAmount = subtotal * (taxPercentage / 100);
  const serviceAmount = subtotal * (servicePercentage / 100);
  const total = subtotal + taxAmount + serviceAmount;

  const handleNext = () => {
    setBills(bills.map(b => b.id === currentBill.id
      ? { ...b, subtotal, tax: taxAmount, serviceCharge: serviceAmount, total }
      : b
    ));
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
                  value={taxInput}
                  disabled={isInputDisabled}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setTaxInput(e.target.value);
                    setTaxPercentage(parseFloat(e.target.value) || 0);
                  }}
                  className="w-20 text-right text-xl font-black text-gray-900 dark:text-white bg-transparent outline-none"
                />
                <span className="text-gray-400 font-bold">%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px]">Biaya Layanan (%)</span>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={serviceInput}
                  disabled={isInputDisabled}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setServiceInput(e.target.value);
                    setServicePercentage(parseFloat(e.target.value) || 0);
                  }}
                  className="w-20 text-right text-xl font-black text-gray-900 dark:text-white bg-transparent outline-none"
                />
                <span className="text-gray-400 font-bold">%</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
              <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Pajak ({taxPercentage}%)</span>
              <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Layanan ({servicePercentage}%)</span>
              <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(serviceAmount)}</span>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 pt-2 flex justify-between">
              <span className="font-black text-gray-900 dark:text-white">Total</span>
              <span className="font-black text-xl text-indigo-600 dark:text-indigo-400">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={handleNext}
          disabled={isInputDisabled}
          className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50"
        >
          <span>Lanjut ke Pembayaran</span>
          <ChevronRight size={20} />
        </button>
      </div>
    </motion.div>
  );
};
