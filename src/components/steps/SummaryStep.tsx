import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Plus, Share2, Download, AlertCircle, Pencil, Trash2, Check, Link as LinkIcon, Copy, X, Camera, Upload } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { encodeShareData } from '../../utils/shareUtils';
import { ReceiptData, Person, Payment, ANIMALS } from '../../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type SortableBillItemProps = {
  bill: ReceiptData;
  setCurrentBillId: (id: string | null) => void;
  setStep: (step: any) => void;
  setBills: (bills: ReceiptData[]) => void;
  bills: ReceiptData[];
  formatCurrency: (amount: number) => string;
  isInputDisabled?: boolean;
};

const SortableBillItem: React.FC<SortableBillItemProps> = ({ bill, setCurrentBillId, setStep, setBills, bills, formatCurrency, isInputDisabled }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bill.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex justify-between items-center p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-shadow ${isDragging ? 'opacity-50 shadow-lg z-20 scale-[1.02]' : 'hover:shadow-md'}`}
    >
      <div className="flex items-center space-x-3">
        <div className="flex flex-col">
          <span className="font-bold text-gray-900 dark:text-white text-sm">{bill.name}</span>
          <span className="text-[10px] text-gray-500">{bill.items.length} item</span>
        </div>
        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          {!isInputDisabled && (
            <>
              <button
                onClick={() => {
                  setCurrentBillId(bill.id);
                  setStep('BILL_NAME');
                }}
                className="p-2 text-gray-400 hover:text-indigo-500 transition-colors bg-gray-50 dark:bg-gray-800 rounded-xl"
                title="Edit Nota"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Hapus nota ini?')) {
                    setBills(bills.filter(b => b.id !== bill.id));
                    if (bills.length === 1) setStep('UPLOAD');
                  }
                }}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 dark:bg-gray-800 rounded-xl"
                title="Hapus Nota"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
      <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(bill.total)}</span>
    </div>
  );
};

type SummaryStepProps = {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  bills: ReceiptData[];
  people: Person[];
  payments: Payment[];
  setBills: (bills: ReceiptData[]) => void;
  setPeople: (people: Person[]) => void;
  setPayments: (payments: Payment[]) => void;
  setStep: (step: any) => void;
  setCurrentBillId: (id: string | null) => void;
  formatCurrency: (amount: number) => string;
  totalBill: number;
  totals: any[];
  shareRef: React.RefObject<HTMLDivElement | null>;
  handleShare: () => void;
  handleDownload: () => void;
  isSharing: boolean;
  setTaxPercentage: (val: string) => void;
  setServicePercentage: (val: string) => void;
  sessionId?: string | null;
  isInputDisabled?: boolean;
  startCamera: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleManualInput: () => void;
};

export const SummaryStep: React.FC<SummaryStepProps> = ({
  darkMode, setDarkMode, bills, people, payments, setBills, setPeople, setPayments, setStep, setCurrentBillId, formatCurrency, totalBill, totals, shareRef, handleShare, handleDownload, isSharing, setTaxPercentage, setServicePercentage, sessionId, isInputDisabled, startCamera, handleFileUpload, handleManualInput
}) => {
  const hasUnassigned = bills.some(b => b.items.some(i => i.sharedBy.length === 0));
  const unassignedItemsCount = bills.reduce((acc, b) => acc + b.items.filter(i => i.sharedBy.length === 0).length, 0);

  const [isCopied, setIsCopied] = React.useState(false);
  const [isCopiedId, setIsCopiedId] = React.useState(false);

  const [showAddModal, setShowAddModal] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleCopyLink = () => {
    const payload = { bills, people, payments, totals };
    const encoded = encodeShareData(payload);

    // Get base URL without query params
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?share=${encoded}`;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }).catch(err => {
        console.error('Failed to copy', err);
        alert('Gagal menyalin link.');
      });
    } else {
      // Fallback for non-https / older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Fallback copy failed', err);
        alert('Gagal menyalin link. Pastikan copy manual dari URL jika perlu.');
      }
      document.body.removeChild(textArea);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = bills.findIndex((b) => b.id === active.id);
      const newIndex = bills.findIndex((b) => b.id === over.id);
      setBills(arrayMove(bills, oldIndex, newIndex));
    }
  };

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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col h-full dark:bg-gray-950"
    >
      <div className="p-4 flex justify-between items-center bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900 sticky top-0 z-10">
        <button onClick={() => setStep('PAYMENTS')} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2">
            <h2 className="font-black text-gray-900 dark:text-white text-base tracking-tight">Summary</h2>
            {sessionId && (
              <div className="flex -space-x-1" title="User lain sedang dalam sesi yang sama">
                <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-[10px] border border-white dark:border-gray-950 z-10">🐒</div>
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-[10px] border border-white dark:border-gray-950 z-0">🐱</div>
              </div>
            )}
          </div>
          {sessionId && (
            <div className="flex items-center justify-center mt-1">
              <button
                onClick={() => {
                  const joinUrl = `https://kndrckm.github.io/splitbill/?session=${sessionId}`;
                  navigator.clipboard.writeText(joinUrl);
                  setIsCopiedId(true);
                  setTimeout(() => setIsCopiedId(false), 2000);
                }}
                className={`flex items-center space-x-1.5 px-2 py-1 rounded-md transition-all ${isCopiedId ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}
                title="Salin Link Sesi"
              >
                <span className={`text-[10px] font-black uppercase tracking-widest ${isCopiedId ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                  ID: {sessionId}
                </span>
                {isCopiedId ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} className="text-indigo-400" />}
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleDownload}
            className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
            title="Download Gambar"
          >
            <Download size={18} />
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 dark:shadow-none"
            title="Bagikan Gambar"
          >
            <Share2 size={18} />
          </button>
          <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {hasUnassigned && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-900/30 text-red-800 dark:text-red-200 px-4 py-4 rounded-2xl shadow-md shadow-red-100 dark:shadow-none flex flex-col space-y-2"
          >
            <div className="flex items-start space-x-3">
              <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-xl text-red-600 dark:text-red-400">
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="font-black text-base leading-tight">Ada Item Belum Dibagi!</p>
                <p className="text-red-700 dark:text-red-300 text-xs mt-1">Ada {unassignedItemsCount} item yang belum dibagikan. Total tagihan mungkin tidak akurat.</p>
              </div>
            </div>
            <div className="pt-1">
              <button
                onClick={() => {
                  const billWithUnassigned = bills.find(b => b.items.some(i => i.sharedBy.length === 0));
                  if (billWithUnassigned) {
                    setCurrentBillId(billWithUnassigned.id);
                    setStep('ASSIGN_ITEMS');
                  }
                }}
                className="w-full bg-red-600 text-white font-bold py-2 rounded-lg text-xs shadow-sm active:scale-95 transition-transform"
              >
                Bagi Item Sekarang
              </button>
            </div>
          </motion.div>
        )}

        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider px-1">Penyelesaian</h3>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 space-y-2">
            {calculateSettlements(totals).length === 0 ? (
              <div className="text-center py-2 text-gray-500 dark:text-gray-400 font-medium text-sm">
                Semua sudah lunas! 🎉
              </div>
            ) : (
              <div className="space-y-2">
                {calculateSettlements(totals).map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900 dark:text-white text-xs">{s.from}</span>
                      <ChevronRight size={12} className="text-indigo-400" />
                      <span className="font-bold text-gray-900 dark:text-white text-xs">{s.to}</span>
                    </div>
                    <div className="font-black text-indigo-600 dark:text-indigo-400 text-xs">{formatCurrency(s.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <h3 className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider px-1">Rincian Per Orang</h3>
          <div className="space-y-1">
            {totals.map((person, index) => (
              <motion.div
                layout
                key={person.id}
                className="relative overflow-hidden py-2 px-1 border-b border-gray-100 dark:border-gray-900 last:border-0"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full ${person.color} flex items-center justify-center text-white font-bold text-xs shadow-inner relative overflow-hidden`}>
                      <span
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                          lineHeight: 1,
                          fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"'
                        }}
                      >
                        {getAnimalIcon(index)}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">{person.name}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(person.finalTotal)}
                    </div>
                    <div className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${person.balance > 0.01 ? 'text-emerald-500 dark:text-emerald-400' : person.balance < -0.01 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                      {person.balance > 0.01 ? `Piutang ${formatCurrency(person.balance)}` : person.balance < -0.01 ? `Hutang ${formatCurrency(Math.abs(person.balance))}` : 'Lunas'}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider px-1">Ringkasan Nota</h3>
          <div className="space-y-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={bills.map(b => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <AnimatePresence mode="popLayout">
                  {bills.map(bill => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={bill.id}
                    >
                      <SortableBillItem
                        bill={bill}
                        setCurrentBillId={setCurrentBillId}
                        setStep={setStep}
                        setBills={setBills}
                        bills={bills}
                        formatCurrency={formatCurrency}
                        isInputDisabled={isInputDisabled}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </SortableContext>
            </DndContext>
            <div className="flex justify-between font-black text-base text-indigo-600 dark:text-indigo-400 pt-3 px-1">
              <span>Total Pengeluaran</span>
              <span>{formatCurrency(totalBill)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 space-y-2">
        <button
          onClick={() => setShowAddModal(true)}
          disabled={isInputDisabled}
          className="w-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold py-4 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          <span>Tambah Nota Lain</span>
        </button>
        <button
          onClick={() => {
            if (window.confirm('Keluar dari sesi dan mulai baru? Data di sesi ini tetap aman untuk pengguna lain.')) {
              localStorage.removeItem('splitbill_state');
              window.location.href = window.location.pathname;
            }
          }}
          className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-200 font-bold py-4 px-6 rounded-xl transition-all active:scale-95 text-sm"
        >
          Mulai Baru / Keluar Sesi
        </button>
      </div>
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-950 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-xl text-gray-900 dark:text-white">Tambah Nota</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-800 rounded-full">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => { setShowAddModal(false); startCamera(); }}
                  disabled={isInputDisabled}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center space-x-3 transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none"
                >
                  <Camera size={20} />
                  <span className="text-base">Ambil Foto Nota</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    onClick={() => { fileInputRef.current?.click(); }}
                    disabled={isInputDisabled}
                    className="flex-1 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-300 font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 text-sm"
                  >
                    <Upload size={16} />
                    <span>Upload Foto</span>
                  </button>
                  <button
                    onClick={() => { setShowAddModal(false); handleManualInput(); }}
                    disabled={isInputDisabled}
                    className="flex-1 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-300 font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 text-sm"
                  >
                    <Plus size={16} />
                    <span>Input Manual</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          setShowAddModal(false);
          handleFileUpload(e);
        }}
        accept="image/*"
        className="hidden"
      />
    </motion.div>
  );
};
