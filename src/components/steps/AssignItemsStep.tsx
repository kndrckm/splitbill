import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Plus, Trash2, Check, SplitSquareHorizontal, Copy } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { ReceiptData, Person, Item } from '../../types';

type AssignItemsStepProps = {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  currentBill: ReceiptData | undefined;
  people: Person[];
  setBills: (bills: ReceiptData[]) => void;
  bills: ReceiptData[];
  setStep: (step: any) => void;
  formatCurrency: (amount: number) => string;
  toggleItemShare: (itemId: string, personId: string) => void;
  selectAllPeopleForItem: (itemId: string) => void;
  generateId: () => string;
};

export const AssignItemsStep: React.FC<AssignItemsStepProps> = ({ 
  darkMode, setDarkMode, currentBill, people, setBills, bills, setStep, formatCurrency, toggleItemShare, selectAllPeopleForItem, generateId 
}) => {
  if (!currentBill) return null;

  const addItem = () => {
    const newItem: Item = {
      id: generateId(),
      name: 'Item Baru',
      price: 0,
      qty: 1,
      sharedBy: [],
    };
    setBills(bills.map(b => b.id === currentBill.id ? { ...b, items: [...b.items, newItem] } : b));
  };

  const removeItem = (id: string) => {
    if (window.confirm('Hapus item ini dari nota?')) {
      setBills(bills.map(b => b.id === currentBill.id ? { ...b, items: b.items.filter(i => i.id !== id) } : b));
    }
  };

  const duplicateItem = (item: Item) => {
    const newItem: Item = {
      ...item,
      id: generateId(),
      sharedBy: [...item.sharedBy], // keep existing sharing
    };
    setBills(bills.map(b => b.id === currentBill.id ? { ...b, items: [...b.items, newItem] } : b));
  };

  const updateItem = (id: string, updates: Partial<Item>) => {
    setBills(bills.map(b => b.id === currentBill.id ? { ...b, items: b.items.map(i => i.id === id ? { ...i, ...updates } : i) } : b));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full dark:bg-gray-950"
    >
      <div className="p-4 flex justify-between items-center bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900 sticky top-0 z-10">
        <button onClick={() => setStep('BILL_NAME')} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <h2 className="font-black text-gray-900 dark:text-white text-base tracking-tight">{currentBill.name}</h2>
          <p className="text-[8px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-widest">Bagi Item</p>
        </div>
        <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {currentBill.items.map((item) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={item.id} 
              className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                      onFocus={(e) => { if (item.name === 'Item Baru') e.target.select(); }}
                      className="font-bold text-gray-900 dark:text-white text-base bg-transparent focus:outline-none focus:text-indigo-500 dark:focus:text-indigo-400 w-full"
                    />
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-400 dark:text-gray-500">
                    <div className="flex items-center bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-lg">
                      <span className="text-[8px] mr-1">Rp.</span>
                      <input 
                        type="number"
                        value={item.price === 0 ? '' : item.price}
                        placeholder="0"
                        onFocus={(e) => { if (item.price === 0) e.target.select(); }}
                        onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                        className="bg-transparent w-16 font-bold focus:outline-none focus:text-indigo-500 dark:focus:text-indigo-400"
                      />
                    </div>
                    <span>x</span>
                    <input 
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateItem(item.id, { qty: parseInt(e.target.value) || 1 })}
                      className="bg-gray-50 dark:bg-gray-800 w-8 px-1 py-0.5 rounded-lg font-bold text-center focus:outline-none focus:text-indigo-500 dark:focus:text-indigo-400"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => duplicateItem(item)}
                    className="p-1 text-gray-300 dark:text-gray-600 hover:text-indigo-500 transition-colors"
                    title="Duplikat Item"
                  >
                    <Copy size={16} />
                  </button>
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Dibagi Ke:</span>
                  <button 
                    onClick={() => selectAllPeopleForItem(item.id)}
                    className="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center space-x-1"
                  >
                    <SplitSquareHorizontal size={10} />
                    <span>{item.sharedBy.length === people.length ? 'Hapus Semua' : 'Semua Orang'}</span>
                  </button>
                </div>
                {item.sharedBy.length > 0 && (
                  <div className="text-[8px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg inline-block">
                    {formatCurrency((item.price * item.qty) / item.sharedBy.length)} / orang
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {people.map(person => {
                    const isShared = item.sharedBy.includes(person.id);
                    return (
                      <button
                        key={person.id}
                        onClick={() => toggleItemShare(item.id, person.id)}
                        className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-lg border-2 transition-all active:scale-95 ${
                          isShared 
                            ? `${person.color} border-transparent text-white shadow-sm` 
                            : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-indigo-100 dark:hover:border-indigo-900'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full ${isShared ? 'bg-white/20' : person.color} flex items-center justify-center text-[8px] font-bold`}>
                          {isShared ? <Check size={10} /> : person.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[10px] font-bold">{person.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <button 
          onClick={addItem}
          className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-400 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all flex items-center justify-center space-x-2 font-bold text-sm"
        >
          <Plus size={16} />
          <span>Tambah Item Manual</span>
        </button>
      </div>

      <div className="p-4 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-900 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <div className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest">Subtotal Nota</div>
          <div className="text-xl font-black text-gray-900 dark:text-white">{formatCurrency(currentBill.items.reduce((sum, i) => sum + (i.price * i.qty), 0))}</div>
        </div>
        <button
          onClick={() => setStep('TAX_SERVICE')}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          <span>Lanjut Pajak & Layanan</span>
          <ChevronRight size={20} />
        </button>
      </div>
    </motion.div>
  );
};
