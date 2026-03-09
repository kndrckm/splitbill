import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Person, Payment } from '../../types';
import { generateId } from '../../utils';

type PaymentsStepProps = {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  people: Person[];
  payments: Payment[];
  setPayments: (payments: Payment[]) => void;
  setStep: (step: any) => void;
  formatCurrency: (amount: number) => string;
  totalBill: number;
  isInputDisabled?: boolean;
};

export const PaymentsStep: React.FC<PaymentsStepProps> = ({
  darkMode, setDarkMode, people, payments, setPayments, setStep, formatCurrency, totalBill, isInputDisabled
}) => {
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, totalBill - totalPaid);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full dark:bg-gray-950"
    >
      <div className="p-4 flex justify-between items-center">
        <button onClick={() => setStep('TAX_SERVICE')} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h2 className="font-black text-gray-900 dark:text-white text-base tracking-tight">Pembayaran</h2>
          <p className="text-[8px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-widest">Siapa yang sudah bayar?</p>
        </div>
        <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Total Tagihan</span>
            <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalBill)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Total Dibayar</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalPaid)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
            <span className="font-bold text-gray-900 dark:text-white text-sm">Sisa</span>
            <span className={`font-black text-lg ${remaining > 0.01 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {remaining > 0.01 ? formatCurrency(remaining) : 'Lunas!'}
            </span>
          </div>
        </div>

        {payments.map((payment) => (
          <div key={payment.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <select
                value={payment.personId}
                onChange={(e) => {
                  if (isInputDisabled) return;
                  setPayments(payments.map(p => p.id === payment.id ? { ...p, personId: e.target.value } : p));
                }}
                disabled={isInputDisabled}
                className="font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                {people.map(person => (
                  <option key={person.id} value={person.id}>{person.name}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (isInputDisabled) return;
                  setPayments(payments.filter(p => p.id !== payment.id));
                }}
                disabled={isInputDisabled}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <input
              type="number"
              value={payment.amount || ''}
              onChange={(e) => {
                if (isInputDisabled) return;
                setPayments(payments.map(p => p.id === payment.id ? { ...p, amount: parseFloat(e.target.value) || 0 } : p));
              }}
              disabled={isInputDisabled}
              placeholder="Jumlah"
              className="w-full text-2xl font-black text-gray-900 dark:text-white bg-transparent border-none outline-none placeholder-gray-300 dark:placeholder-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        ))}

        <button
          onClick={() => {
            if (isInputDisabled) return;
            const defaultPersonId = people[0]?.id || '';
            setPayments([...payments, { id: generateId(), personId: defaultPersonId, amount: 0, note: '' }]);
          }}
          disabled={isInputDisabled}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 font-bold text-sm hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Tambah Pembayaran
        </button>
      </div>

      <div className="p-4">
        <button
          onClick={() => setStep('SUMMARY')}
          className="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-lg"
        >
          Lihat Ringkasan <ChevronRight size={20} />
        </button>
      </div>
    </motion.div>
  );
};
