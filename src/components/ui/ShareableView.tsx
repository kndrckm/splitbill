import React from 'react';
import { ReceiptData, Person } from '../../types';
import { ANIMALS } from '../../constants';

// Color map for Tailwind class -> hex (used for off-screen render compat)
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

type ShareableViewProps = {
    bills: ReceiptData[];
    people: Person[];
    totals: any[];
    formatCurrency: (amount: number) => string;
    totalBill: number;
};

// This component is now only a fallback preview -- sharing uses renderSummaryCanvas from shareUtils.ts
export const ShareableView: React.FC<ShareableViewProps> = ({ people, totals, formatCurrency, totalBill }) => {
    const getAnimalIcon = (index: number) => ANIMALS[index % ANIMALS.length];

    const calculateSettlements = (totals: any[]) => {
        const debtors = totals.filter(t => t.balance < -0.01).map(t => ({ ...t, balance: Math.abs(t.balance) }));
        const creditors = totals.filter(t => t.balance > 0.01).map(t => ({ ...t }));
        const settlements: { from: string, to: string, amount: number }[] = [];
        let d = 0, c = 0;
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

    const settlements = calculateSettlements(totals);

    return (
        <div className="p-6 font-sans bg-white" style={{ color: '#111827', width: '360px' }}>
            <div className="mb-6">
                <h2 className="text-sm font-bold tracking-widest uppercase mb-3" style={{ color: '#6b7280' }}>Penyelesaian</h2>
                <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid #f3f4f6' }}>
                    {settlements.length === 0 ? (
                        <div className="text-center py-2 text-sm font-medium" style={{ color: '#6b7280' }}>
                            Semua sudah lunas! \uD83C\uDF89
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {settlements.map((s, i) => (
                                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl" style={{ backgroundColor: '#eef2ff' }}>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-bold text-xs" style={{ color: '#1f2937' }}>{s.from}</span>
                                        <span style={{ color: '#818cf8', fontSize: '10px' }}>&rarr;</span>
                                        <span className="font-bold text-xs" style={{ color: '#1f2937' }}>{s.to}</span>
                                    </div>
                                    <span className="font-black text-sm" style={{ color: '#4f46e5' }}>{formatCurrency(s.amount)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-4">
                <h2 className="text-sm font-bold tracking-widest uppercase mb-3" style={{ color: '#6b7280' }}>Ringkasan per Orang</h2>
                <div className="space-y-2">
                    {totals.map((person, index) => (
                        <div key={person.id} className="bg-white rounded-2xl p-3 shadow-sm" style={{ border: '1px solid #f3f4f6' }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                                        style={{ backgroundColor: COLOR_MAP[person.color] || '#6366f1' }}
                                    >
                                        {getAnimalIcon(index)}
                                    </div>
                                    <span className="font-bold text-xs" style={{ color: '#111827' }}>{person.name}</span>
                                </div>
                                <span className="font-black text-sm" style={{ color: '#111827' }}>{formatCurrency(person.total)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-3" style={{ borderTop: '1px solid #f3f4f6' }}>
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold" style={{ color: '#6b7280' }}>TOTAL</span>
                    <span className="font-black text-base" style={{ color: '#111827' }}>{formatCurrency(totalBill)}</span>
                </div>
            </div>
        </div>
    );
};
