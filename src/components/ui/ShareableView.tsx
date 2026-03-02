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

  const calculateSettlements = (totals: any[]) => {
    const debtors = totals.filter(t => t.balance < -0.01).map(t => ({ ...t, balance: Math.abs(t.balance) }));
    const creditors = totals.filter(t => t.balance > 0.01).map(t => ({ ...t }));

    const settlements: { from: string, to: string, amount: number }[] = [];

    let d = 0;
    let c = 0;

    while (d < debtors.length && c < creditors.length) {
      const amount = Math.min(debtors[d].balance, creditors[c].balance);
      settlements.push({ from: debtors[d].name, to: creditors[c].name, amount });

      debtors[d].balance -= amount;
      creditors[c].balance -= amount;

      if (debtors[d].balance < 0.01) d++;
      if (creditors[c].balance < 0.01) c++;
    }

    return settlements;
  };

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
        className="w-[360px] p-6 font-sans bg-white shadow-xl"
        style={{ color: '#111827' }}
      >
        <div className="mb-6">
          <h2 className="text-sm font-bold tracking-widest uppercase mb-3" style={{ color: '#6b7280' }}>Penyelesaian</h2>
          <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid #f3f4f6' }}>
            {calculateSettlements(totals).length === 0 ? (
              <div className="text-center py-2 text-sm font-medium" style={{ color: '#6b7280' }}>
                Semua sudah lunas! 🎉
              </div>
            ) : (
              <div className="space-y-2">
                {calculateSettlements(totals).map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl" style={{ backgroundColor: '#eef2ff' }}>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs" style={{ color: '#1f2937' }}>{s.from}</span>
                      <span style={{ color: '#818cf8', fontSize: '10px' }}>&rarr;</span>
                      <span className="font-bold text-xs" style={{ color: '#1f2937' }}>{s.to}</span>
                    </div>
                    <div className="font-black text-xs" style={{ color: '#4f46e5' }}>{formatCurrency(s.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <h2 className="text-sm font-bold tracking-widest uppercase mb-3" style={{ color: '#6b7280' }}>Rincian Per Orang</h2>
        <div className="space-y-3">
          {totals.map((person, index) => (
            <div key={person.id} className="rounded-2xl p-4" style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm relative overflow-hidden shadow-inner"
                    style={{ backgroundColor: COLOR_MAP[person.color] || '#6366f1' }}
                  >
                    <span
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ lineHeight: 1, fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"' }}
                    >
                      {getAnimalIcon(index)}
                    </span>
                  </div>
                  <h3 className="font-black text-sm" style={{ color: '#111827' }}>{person.name}</h3>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black" style={{ color: '#4f46e5' }}>{formatCurrency(person.finalTotal)}</div>
                  <div
                    className="text-[8px] font-bold uppercase tracking-widest mt-0.5"
                    style={{ color: person.balance > 0.01 ? '#10b981' : person.balance < -0.01 ? '#ef4444' : '#9ca3af' }}
                  >
                    {person.balance > 0.01 ? `Piutang ${formatCurrency(person.balance)}` : person.balance < -0.01 ? `Hutang ${formatCurrency(Math.abs(person.balance))}` : 'Lunas'}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-3" style={{ borderTop: '1px solid #e5e7eb' }}>
                {bills.map(bill => {
                  const personItems = bill.items.filter(item => item.sharedBy.includes(person.id));
                  if (personItems.length === 0) return null;
                  return (
                    <div key={bill.id} className="space-y-0.5">
                      <div className="text-[7px] font-black uppercase tracking-widest mb-0.5" style={{ color: '#9ca3af' }}>{bill.name}</div>
                      {personItems.map(item => (
                        <div key={item.id} className="flex justify-between text-[9px]" style={{ color: '#4b5563' }}>
                          <span className="truncate max-w-[200px]">{item.name} <span style={{ color: '#9ca3af' }}>x{item.qty}</span></span>
                          <span className="font-bold shrink-0">{formatCurrency(item.price / item.sharedBy.length)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4" style={{ borderTop: '2px dashed #e5e7eb' }}>
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold uppercase tracking-widest text-[10px]" style={{ color: '#9ca3af' }}>Total Keseluruhan</span>
            <span className="text-2xl font-black" style={{ color: '#4f46e5' }}>{formatCurrency(totalBill)}</span>
          </div>
          <p className="text-center text-[8px] font-medium mt-8 italic" style={{ color: '#9ca3af' }}>Dibuat dengan SplitBill App</p>
        </div>
      </div>
    </div>
  );
};
