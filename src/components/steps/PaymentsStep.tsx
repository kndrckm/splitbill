import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Person, Payment } from '../../types';

type PaymentsStepProps = {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  people: Person[];
  payments: Payment[];
  setPayments: (payments: Payment[]) => void;
  setStep: (step: any) => void;
  formatCurrency: (amount: number) => string;
  totalBill: number;
  generateId: () => string;
  isInputDisabled?: boolean;
};

export const PaymentsStep: React.FC<PaymentsStepProps> = ({
  darkMode, setDarkMode, people, payments, setPayments, setStep, formatCurrency, totalBill, generateId, isInputDisabled
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

        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider px-1">Tambah Pembayaran</h3>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {people.map(person => (
                <button
                  key={person.id}
                  disabled={isInputDisabled}
                  onClick={() => {
                    const amount = remaining > 0 ? remaining : 0;
                    setPayments([...payments, { id: generateId(), personId: person.id, amount, note: 'Bayar' }]);
                  }}
                  className={`flex items-center space-x-2 p-2 rounded-xl border-2 transition-all active:scale-95 ${person.color.replace('bg-', 'border-').replace('500', '100')} dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed`}
                >
                  <div className={`w-6 h-6 rounded-full ${person.color} flex items-center justify-center text-white font-bold text-[10px]`}>
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-gray-700 dark:text-gray-300 text-xs truncate">{person.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider px-1">Riwayat Pembayaran</h3>
          {payments.length === 0 ? (
            <div className="text-center py-6 text-gray-400 dark:text-gray-600 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-xs">
              Belum ada pembayaran tercatat.
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map(payment => {
                const person = people.find(p => p.id === payment.personId);
                return (
                  <div key={payment.id} className="bg-white dark:bg-gray-900 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-7 h-7 rounded-full ${person?.color} flex items-center justify-center text-white font-bold text-[10px]`}>
                        {person?.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white text-xs">{person?.name}</div>
                        <input
                          type="text"
                          value={payment.note}
                          disabled={isInputDisabled}
                          onChange={(e) => {
                            setPayments(payments.map(p => p.id === payment.id ? { ...p, note: e.target.value } : p));
                          }}
                          className="text-[10px] text-gray-400 dark:text-gray-500 bg-transparent focus:outline-none focus:text-indigo-500 dark:focus:text-indigo-400 disabled:opacity-50"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className="flex items-center text-xs font-black text-gray-900 dark:text-white">
                          <span className="text-[8px] mr-1">Rp.</span>
                          <input
                            type="number"
                            value={payment.amount === 0 ? '' : payment.amount}
                            disabled={isInputDisabled}
                            placeholder="0"
                            onFocus={(e) => { if (payment.amount === 0) e.target.select(); }}
                            onChange={(e) => {
                              setPayments(payments.map(p => p.id === payment.id ? { ...p, amount: parseFloat(e.target.value) || 0 } : p));
                            }}
                            className="bg-transparent w-16 text-right focus:outline-none focus:text-indigo-500 dark:focus:text-indigo-400 disabled:opacity-50"
                          />
                        </div>
                      </div>
                      {!isInputDisabled && (
                        <button
                          onClick={() => setPayments(payments.filter(p => p.id !== payment.id))}
                          className="text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setStep('SUMMARY')}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          <span>Lihat Hasil Akhir</span>
          <ChevronRight size={20} />
        </button>
      </div>
    </motion.div>
  );
};
