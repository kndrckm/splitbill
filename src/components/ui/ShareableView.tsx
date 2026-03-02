import React from 'react';
import { ReceiptData, Person, ANIMALS } from '../../types';

type ShareableViewProps = {
  shareRef: React.RefObject<HTMLDivElement | null>;
  bills: ReceiptData[];
  people: Person[];
  totals: any[];
  formatCurrency: (amount: number) => string;
  totalBill: number;
};

export const ShareableView: React.FC<ShareableViewProps> = ({ shareRef, bills, people, totals, formatCurrency, totalBill }) => {
  const getAnimalIcon = (index: number) => ANIMALS[index % ANIMALS.length];

  const COLOR_MAP: Record<string, string> = {
    'bg-indigo-500': '#6366f1',
    'bg-emerald-500': '#10b981',
    'bg-rose-500': '#f43f5e',
    'bg-amber-500': '#f59e0b',
    'bg-violet-500': '#8b5cf6',
    'bg-cyan-500': '#06b6d4',
    'bg-orange-500': '#f97316',
    'bg-fuchsia-500': '#d946ef',
  };

  return (
    <div className="fixed -left-[9999px] top-0">
      <div 
        ref={shareRef}
        className="w-[400px] p-8 font-sans"
        style={{ backgroundColor: '#ffffff', color: '#111827' }}
      >
        <div className="text-center mb-8 pb-8" style={{ borderBottom: '2px dashed #e5e7eb' }}>
          <div 
            className="w-16 h-16 text-white rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: '#4f46e5', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
          >
            <span className="text-3xl font-black">SB</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: '#111827' }}>SplitBill Summary</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold mt-1" style={{ color: '#9ca3af' }}>Terima kasih telah berbagi!</p>
        </div>

        <div className="space-y-8">
          {totals.map((person, index) => (
            <div key={person.id} className="rounded-3xl p-6" style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg"
                    style={{ backgroundColor: COLOR_MAP[person.color] || '#6366f1' }}
                  >
                    {getAnimalIcon(index)}
                  </div>
                  <h3 className="font-black text-lg" style={{ color: '#111827' }}>{person.name}</h3>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black" style={{ color: '#4f46e5' }}>{formatCurrency(person.finalTotal)}</div>
                  <div 
                    className="text-[8px] font-bold uppercase tracking-widest mt-1"
                    style={{ color: person.balance > 0.01 ? '#10b981' : person.balance < -0.01 ? '#ef4444' : '#9ca3af' }}
                  >
                    {person.balance > 0.01 ? `Piutang ${formatCurrency(person.balance)}` : person.balance < -0.01 ? `Hutang ${formatCurrency(Math.abs(person.balance))}` : 'Lunas'}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 pt-4" style={{ borderTop: '1px solid #e5e7eb' }}>
                {bills.map(bill => {
                  const personItems = bill.items.filter(item => item.sharedBy.includes(person.id));
                  if (personItems.length === 0) return null;
                  return (
                    <div key={bill.id} className="space-y-1">
                      <div className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: '#9ca3af' }}>{bill.name}</div>
                      {personItems.map(item => (
                        <div key={item.id} className="flex justify-between text-[10px]" style={{ color: '#4b5563' }}>
                          <span>{item.name} <span style={{ color: '#9ca3af' }}>x{item.qty}</span></span>
                          <span className="font-bold">{formatCurrency(item.price / item.sharedBy.length)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-8" style={{ borderTop: '2px dashed #e5e7eb' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold uppercase tracking-widest text-[10px]" style={{ color: '#9ca3af' }}>Total Keseluruhan</span>
            <span className="text-2xl font-black" style={{ color: '#4f46e5' }}>{formatCurrency(totalBill)}</span>
          </div>
          <p className="text-center text-[8px] font-medium mt-8 italic" style={{ color: '#9ca3af' }}>Dibuat dengan SplitBill App</p>
        </div>
      </div>
    </div>
  );
};
