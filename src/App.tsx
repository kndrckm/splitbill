import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Camera, Upload, Users, Receipt, Check, Plus, Trash2, ChevronRight, ChevronLeft, Loader2, Share2, SplitSquareHorizontal, X, RefreshCw, AlertCircle, Download, Image as ImageIcon } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type Person = {
  id: string;
  name: string;
  color: string;
};

type Item = {
  id: string;
  name: string;
  price: number;
  qty: number;
  sharedBy: string[]; // Array of Person IDs
};

type Payment = {
  id: string;
  personId: string;
  amount: number;
  note: string;
};

type ReceiptData = {
  id: string;
  name: string;
  items: Item[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
};

type DistributionMode = 'PROPORTIONAL' | 'EQUAL';

type Step = 'RESTORE' | 'UPLOAD' | 'BILL_NAME' | 'CAMERA' | 'PROCESSING' | 'ADD_PEOPLE' | 'ASSIGN_ITEMS' | 'TAX_SERVICE' | 'PAYMENTS' | 'SUMMARY';

// --- Constants ---
const COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
  'bg-orange-500', 'bg-cyan-500'
];

const HEX_COLORS: Record<string, string> = {
  'bg-red-500': '#ef4444',
  'bg-blue-500': '#3b82f6',
  'bg-green-500': '#22c55e',
  'bg-yellow-500': '#eab308',
  'bg-purple-500': '#a855f7',
  'bg-pink-500': '#ec4899',
  'bg-indigo-500': '#6366f1',
  'bg-teal-500': '#14b8a6',
  'bg-orange-500': '#f97316',
  'bg-cyan-500': '#06b6d4',
  'bg-indigo-600': '#4f46e5',
  'bg-indigo-50': '#eef2ff',
  'bg-gray-50': '#f9fafb',
  'bg-white': '#ffffff',
  'text-white': '#ffffff',
  'text-gray-900': '#111827',
  'text-gray-400': '#9ca3af',
  'text-indigo-600': '#4f46e5',
  'text-indigo-400': '#818cf8'
};

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substring(2, 9);

const formatCurrency = (amount: number) => {
  return `Rp. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:image/jpeg;base64, part
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export default function App() {
  const [step, setStep] = useState<Step>('UPLOAD');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [bills, setBills] = useState<ReceiptData[]>([]);
  const [currentBillId, setCurrentBillId] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [newPersonName, setNewPersonName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [taxPercentage, setTaxPercentage] = useState<string>('0');
  const [servicePercentage, setServicePercentage] = useState<string>('0');
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('PROPORTIONAL');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingState, setPendingState] = useState<any>(null);
  const [isSharing, setIsSharing] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const currentBill = bills.find(b => b.id === currentBillId);

  // --- Persistence ---
  useEffect(() => {
    const saved = localStorage.getItem('splitbill_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.bills && parsed.bills.length > 0) {
          setPendingState(parsed);
          setStep('RESTORE');
        } else {
          setIsInitialized(true);
        }
      } catch (e) {
        console.error("Failed to load state", e);
        setIsInitialized(true);
      }
    } else {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('splitbill_state', JSON.stringify({
        bills,
        people,
        payments,
        step,
        currentBillId
      }));
    }
  }, [bills, people, payments, step, currentBillId, isInitialized]);

  // --- Handlers ---
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStep('CAMERA');
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please use upload instead.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        const base64 = dataUrl.split(',')[1];
        setReceiptImage(dataUrl);
        stopCamera();
        setStep('PROCESSING');
        processReceipt(base64, 'image/jpeg');
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      setReceiptImage(`data:${file.type};base64,${base64}`);
      setStep('PROCESSING');
      await processReceipt(base64, file.type);
    } catch (err) {
      console.error(err);
      setError('Failed to read image.');
      setStep('UPLOAD');
    }
  };

  const processReceipt = async (base64Data: string, mimeType: string) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API Key is missing.");
      }
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `Extract the restaurant name, items, quantities, prices, subtotal, tax, service charge, and total from this receipt.
            Return the data in JSON format.
            - "restaurantName": string (the name of the restaurant or store).
            - "items": array of objects with "name" (string), "qty" (number), and "price" (number - total price for that item/qty).
            - "subtotal": number (sum of items before tax/service).
            - "tax": number (total tax amount).
            - "serviceCharge": number (total service charge or tip amount).
            - "total": number (final total amount).
            If any value is missing or unclear, use 0 or empty string. Ensure prices are numbers, not strings. Do not include currency symbols in the numbers. 
            Note: This receipt is in Indonesian Rupiah (IDR). Prices might be large numbers like 50000 or 150000.`,
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              restaurantName: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    qty: { type: Type.NUMBER },
                    price: { type: Type.NUMBER },
                  },
                  required: ['name', 'price'],
                },
              },
              subtotal: { type: Type.NUMBER },
              tax: { type: Type.NUMBER },
              serviceCharge: { type: Type.NUMBER },
              total: { type: Type.NUMBER },
            },
            required: ['restaurantName', 'items', 'subtotal', 'tax', 'serviceCharge', 'total'],
          },
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from Gemini");
      
      const parsedData = JSON.parse(text);
      
      const billId = generateId();
      const itemsWithIds: Item[] = parsedData.items.map((item: any) => ({
        id: generateId(),
        name: item.name,
        qty: item.qty || 1,
        price: item.price,
        sharedBy: [],
      }));

      const subtotal = parsedData.subtotal || 0;
      const tax = parsedData.tax || 0;
      const serviceCharge = parsedData.serviceCharge || 0;

      let initialTaxPct = 0;
      let initialServicePct = 0;

      if (subtotal > 0) {
        initialTaxPct = (tax / subtotal) * 100;
        initialServicePct = (serviceCharge / subtotal) * 100;
      }

      setTaxPercentage(initialTaxPct.toFixed(2));
      setServicePercentage(initialServicePct.toFixed(2));

      const newBill: ReceiptData = {
        id: billId,
        name: parsedData.restaurantName || 'Nota Baru',
        items: itemsWithIds,
        subtotal: subtotal,
        tax: tax,
        serviceCharge: serviceCharge,
        total: parsedData.total || 0,
      };

      setBills(prev => [...prev, newBill]);
      setCurrentBillId(billId);
      
      if (people.length === 0) {
         setPeople([{ id: generateId(), name: 'Saya', color: COLORS[0] }]);
      }

      setStep('BILL_NAME');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memproses nota.');
      setStep('UPLOAD');
    }
  };

  const addPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    
    const newPerson: Person = {
      id: generateId(),
      name: newPersonName.trim(),
      color: COLORS[people.length % COLORS.length],
    };
    
    setPeople([...people, newPerson]);
    setNewPersonName('');
  };

  const removePerson = (id: string) => {
    setPeople(people.filter(p => p.id !== id));
    // Also remove them from any shared items in all bills
    setBills(bills.map(bill => ({
      ...bill,
      items: bill.items.map(item => ({
        ...item,
        sharedBy: item.sharedBy.filter(personId => personId !== id)
      }))
    })));
  };

  const toggleItemShare = (itemId: string, personId: string) => {
    if (!currentBillId) return;
    
    setBills(bills.map(bill => {
      if (bill.id === currentBillId) {
        return {
          ...bill,
          items: bill.items.map(item => {
            if (item.id === itemId) {
              const isShared = item.sharedBy.includes(personId);
              return {
                ...item,
                sharedBy: isShared 
                  ? item.sharedBy.filter(id => id !== personId)
                  : [...item.sharedBy, personId]
              };
            }
            return item;
          })
        };
      }
      return bill;
    }));
  };

  const selectAllPeopleForItem = (itemId: string) => {
    if (!currentBillId) return;
    const allPersonIds = people.map(p => p.id);
    
    setBills(bills.map(bill => {
      if (bill.id === currentBillId) {
        return {
          ...bill,
          items: bill.items.map(item => {
            if (item.id === itemId) {
              const isAllSelected = item.sharedBy.length === allPersonIds.length;
              return {
                ...item,
                sharedBy: isAllSelected ? [] : [...allPersonIds]
              };
            }
            return item;
          })
        };
      }
      return bill;
    }));
  };

  // --- Calculations ---
  const calculatePersonTotals = () => {
    const personTotals: Record<string, {
      itemTotal: number,
      taxShare: number,
      serviceShare: number,
      finalTotal: number
    }> = {};

    people.forEach(p => {
      personTotals[p.id] = {
        itemTotal: 0,
        taxShare: 0,
        serviceShare: 0,
        finalTotal: 0
      };
    });

    bills.forEach(bill => {
      let billAssignedSubtotal = 0;
      const billPersonItemTotals: Record<string, number> = {};
      people.forEach(p => billPersonItemTotals[p.id] = 0);

      bill.items.forEach(item => {
        if (item.sharedBy.length > 0) {
          const splitPrice = item.price / item.sharedBy.length;
          item.sharedBy.forEach(personId => {
            if (billPersonItemTotals[personId] !== undefined) {
              billPersonItemTotals[personId] += splitPrice;
            }
          });
          billAssignedSubtotal += item.price;
        }
      });

      const baseForProportion = billAssignedSubtotal > 0 ? billAssignedSubtotal : (bill.subtotal || 1);

      people.forEach(person => {
        const itemTotal = billPersonItemTotals[person.id];
        const proportion = itemTotal / baseForProportion;
        const taxShare = bill.tax * proportion;
        const serviceShare = bill.serviceCharge * proportion;

        personTotals[person.id].itemTotal += itemTotal;
        personTotals[person.id].taxShare += taxShare;
        personTotals[person.id].serviceShare += serviceShare;
        personTotals[person.id].finalTotal += (itemTotal + taxShare + serviceShare);
      });
    });

    return people.map(person => {
      const stats = personTotals[person.id];
      const amountPaid = payments.filter(p => p.personId === person.id).reduce((sum, p) => sum + p.amount, 0);
      return {
        ...person,
        ...stats,
        amountPaid,
        balance: amountPaid - stats.finalTotal
      };
    });
  };

  const calculateSettlements = (totals: any[]) => {
    const debtors = totals.filter(t => t.balance < -0.01).map(t => ({ ...t, balance: Math.abs(t.balance) }));
    const creditors = totals.filter(t => t.balance > 0.01).map(t => ({ ...t }));
    
    const settlements: { from: string, to: string, amount: number }[] = [];
    
    let d = 0;
    let c = 0;
    
    while (d < debtors.length && c < creditors.length) {
      const amount = Math.min(debtors[d].balance, creditors[c].balance);
      settlements.push({
        from: debtors[d].name,
        to: creditors[c].name,
        amount
      });
      
      debtors[d].balance -= amount;
      creditors[c].balance -= amount;
      
      if (debtors[d].balance < 0.01) d++;
      if (creditors[c].balance < 0.01) c++;
    }
    
    return settlements;
  };

  // --- Renderers ---
  const renderRestoreSession = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center h-full p-8 text-center space-y-8 bg-indigo-600 text-white"
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
          className="w-full bg-indigo-500/50 hover:bg-indigo-500/70 text-white font-bold py-4 px-6 rounded-2xl active:scale-95 transition-all"
        >
          Mulai Dari Awal
        </button>
      </div>
    </motion.div>
  );

  const renderUpload = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center h-full p-6 text-center space-y-8"
    >
      <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
        <Receipt size={48} />
      </div>
      <div>
        <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">SplitBill</h1>
        <p className="text-gray-500 max-w-[280px] mx-auto leading-relaxed">Cara termudah untuk bagi tagihan. Foto, bagi, dan bereskan.</p>
      </div>
      
      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 text-red-600 p-4 rounded-2xl w-full text-sm border border-red-100"
        >
          {error}
        </motion.div>
      )}

      <div className="w-full space-y-4 mt-8">
        <button 
          onClick={startCamera}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 px-6 rounded-2xl flex items-center justify-center space-x-3 transition-all active:scale-95 shadow-xl shadow-indigo-200"
        >
          <Camera size={24} />
          <span>Foto Nota</span>
        </button>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full bg-white border-2 border-gray-100 hover:border-indigo-100 hover:bg-indigo-50 text-gray-700 font-bold py-5 px-6 rounded-2xl flex items-center justify-center space-x-3 transition-all active:scale-95"
        >
          <Upload size={24} className="text-indigo-600" />
          <span>Unggah Gambar</span>
        </button>

        <button 
          onClick={() => {
            const billId = generateId();
            const newBill: ReceiptData = {
              id: billId,
              name: 'Nota Baru',
              items: [],
              subtotal: 0,
              tax: 0,
              serviceCharge: 0,
              total: 0
            };
            setBills(prev => [...prev, newBill]);
            setCurrentBillId(billId);
            if (people.length === 0) {
              setPeople([{ id: generateId(), name: 'Saya', color: COLORS[0] }]);
            }
            setStep('BILL_NAME');
          }}
          className="w-full bg-gray-50 border-2 border-dashed border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 text-gray-500 font-bold py-5 px-6 rounded-2xl flex items-center justify-center space-x-3 transition-all active:scale-95"
        >
          <Plus size={24} className="text-gray-400" />
          <span>Input Manual</span>
        </button>

        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
      </div>
    </motion.div>
  );

  const renderBillName = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full bg-gray-50"
    >
      <div className="bg-white px-6 py-4 shadow-sm z-10 flex items-center space-x-4">
        <button onClick={() => setStep('UPLOAD')} className="text-gray-400 hover:text-gray-900 p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Nama Pembayaran</h2>
          <p className="text-gray-500 text-sm mt-1">Beri nama untuk nota ini.</p>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Nama Nota</label>
          <input
            type="text"
            value={currentBill?.name || ''}
            onChange={(e) => {
              if (currentBillId) {
                setBills(bills.map(b => b.id === currentBillId ? { ...b, name: e.target.value } : b));
              }
            }}
            placeholder="Contoh: Makan Siang Kantor"
            className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500 transition-colors font-medium text-lg"
          />
        </div>
      </div>

      <div className="p-6 bg-white border-t border-gray-100">
        <button
          onClick={() => setStep('ADD_PEOPLE')}
          disabled={!currentBill?.name.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 px-6 rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50 disabled:bg-gray-400 shadow-xl shadow-indigo-100"
        >
          <span>Lanjut ke Tambah Orang</span>
          <ChevronRight size={20} />
        </button>
      </div>
    </motion.div>
  );

  const renderCamera = () => (
    <div className="relative h-full bg-black flex flex-col">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className="flex-1 object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
        <button 
          onClick={() => { stopCamera(); setStep('UPLOAD'); }}
          className="bg-black/50 text-white p-3 rounded-full backdrop-blur-md"
        >
          <X size={24} />
        </button>
        <div className="bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur-md text-sm font-medium">
          Posisikan nota di dalam bingkai
        </div>
        <div className="w-12" /> {/* Spacer */}
      </div>

      <div className="absolute bottom-12 left-0 right-0 flex justify-center items-center space-x-8">
        <div className="w-12 h-12" /> {/* Spacer */}
        <button 
          onClick={capturePhoto}
          className="w-20 h-20 bg-white rounded-full border-8 border-white/30 flex items-center justify-center active:scale-90 transition-transform"
        >
          <div className="w-14 h-14 bg-white rounded-full border-2 border-black/10" />
        </button>
        <button 
          onClick={() => { stopCamera(); startCamera(); }}
          className="bg-black/50 text-white p-4 rounded-full backdrop-blur-md"
        >
          <RefreshCw size={24} />
        </button>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full p-6 text-center space-y-8"
    >
      <div className="relative">
        {receiptImage && (
          <div className="relative">
            <img src={receiptImage} alt="Receipt" className="w-56 h-72 object-cover rounded-3xl opacity-40 shadow-2xl grayscale" />
            <motion.div 
              className="absolute top-0 left-0 right-0 h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)]"
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white p-6 rounded-3xl shadow-2xl">
            <Loader2 size={40} className="text-indigo-600 animate-spin" />
          </div>
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Menganalisis Nota</h2>
        <p className="text-gray-500 text-sm mt-3 max-w-[240px] mx-auto leading-relaxed">AI kami sedang mengekstrak item, harga, dan pajak untuk Anda.</p>
      </div>
    </motion.div>
  );

  const renderAddPeople = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full bg-gray-50"
    >
      <div className="bg-white px-6 py-4 shadow-sm z-10 flex items-center space-x-4">
        <button onClick={() => setStep('BILL_NAME')} className="text-gray-400 hover:text-gray-900 p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Siapa saja?</h2>
          <p className="text-gray-500 text-sm mt-1">Tambah semua orang yang ikut membayar.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <form onSubmit={addPerson} className="flex space-x-2">
          <input
            type="text"
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
            placeholder="Masukkan nama..."
            className="flex-1 bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
          />
          <button 
            type="submit"
            disabled={!newPersonName.trim()}
            className="bg-indigo-600 text-white p-4 rounded-2xl disabled:opacity-50 disabled:bg-gray-400 transition-all active:scale-95 shadow-lg shadow-indigo-100"
          >
            <Plus size={24} />
          </button>
        </form>

        <div className="space-y-3 mt-6">
          {people.map(person => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              key={person.id} 
              className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100"
            >
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full ${person.color} flex items-center justify-center text-white font-bold text-lg shadow-inner`}>
                  {person.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-bold text-gray-800">{person.name}</span>
              </div>
              <button 
                onClick={() => removePerson(person.id)}
                className="text-gray-300 hover:text-red-500 transition-colors p-2"
              >
                <Trash2 size={20} />
              </button>
            </motion.div>
          ))}
          {people.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Users size={48} className="mx-auto mb-4 opacity-20" />
              <p>Belum ada orang. Tambahkan temanmu!</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 bg-white border-t border-gray-100">
        <button
          onClick={() => setStep('ASSIGN_ITEMS')}
          disabled={people.length === 0}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 px-6 rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50 disabled:bg-gray-400 shadow-xl shadow-indigo-100"
        >
          <span>Lanjut ke Item</span>
          <ChevronRight size={20} />
        </button>
      </div>
    </motion.div>
  );

  const renderAssignItems = () => {
    if (!currentBill) return null;

    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex flex-col h-full bg-gray-50"
      >
        <div className="bg-white px-6 py-4 shadow-sm z-10 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => setStep('ADD_PEOPLE')} className="text-gray-400 hover:text-gray-900 p-2 -ml-2">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Bagi Item</h2>
              <p className="text-gray-500 text-sm mt-1">Ketuk nama orang untuk membagi biaya.</p>
            </div>
          </div>
          <button onClick={() => setStep('ADD_PEOPLE')} className="text-indigo-600 text-sm font-bold p-2 bg-indigo-50 rounded-xl px-4">
            Edit Orang
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-32">
          {currentBill.items.map(item => (
            <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      value={item.qty}
                      onFocus={(e) => { if (item.qty === 0) e.target.select(); }}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setBills(bills.map(b => b.id === currentBillId ? {
                          ...b,
                          items: b.items.map(i => i.id === item.id ? { ...i, qty: val } : i)
                        } : b));
                      }}
                      className="w-10 h-8 text-center bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 font-bold text-sm"
                    />
                    <input 
                      type="text"
                      value={item.name}
                      onFocus={(e) => { if (item.name === 'Item Baru') e.target.select(); }}
                      onChange={(e) => {
                        setBills(bills.map(b => b.id === currentBillId ? {
                          ...b,
                          items: b.items.map(i => i.id === item.id ? { ...i, name: e.target.value } : i)
                        } : b));
                      }}
                      className="font-bold text-gray-900 leading-tight text-base bg-transparent border-b border-transparent focus:border-indigo-200 focus:outline-none flex-1 truncate"
                    />
                  </div>
                  <div className="flex items-center text-indigo-600 font-black mt-1 text-lg">
                    <span className="text-sm mr-1">Rp.</span>
                    <input 
                      type="number"
                      value={item.price}
                      onFocus={(e) => { if (item.price === 0) e.target.select(); }}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setBills(bills.map(b => b.id === currentBillId ? {
                          ...b,
                          items: b.items.map(i => i.id === item.id ? { ...i, price: val } : i)
                        } : b));
                      }}
                      className="bg-transparent border-b border-transparent focus:border-indigo-200 focus:outline-none w-full"
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button 
                    onClick={() => selectAllPeopleForItem(item.id)}
                    className="text-[10px] font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg flex items-center space-x-1 transition-colors"
                  >
                    <SplitSquareHorizontal size={12} />
                    <span>Semua</span>
                  </button>
                  <button 
                    onClick={() => {
                      setBills(bills.map(b => b.id === currentBillId ? {
                        ...b,
                        items: b.items.filter(i => i.id !== item.id)
                      } : b));
                    }}
                    className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1.5 mt-3">
                {people.map(person => {
                  const isSelected = item.sharedBy.includes(person.id);
                  return (
                    <button
                      key={person.id}
                      onClick={() => toggleItemShare(item.id, person.id)}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-90 ${
                        isSelected 
                          ? `${person.color} text-white shadow-sm` 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {isSelected && <Check size={12} />}
                      <span>{person.name}</span>
                    </button>
                  );
                })}
              </div>
              
              {item.sharedBy.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-50 text-[10px] font-bold text-gray-400 flex justify-between uppercase tracking-wider">
                  <span>Dibagi {item.sharedBy.length} orang</span>
                  <span className="text-indigo-600">{formatCurrency(item.price / item.sharedBy.length)} /org</span>
                </div>
              )}
            </div>
          ))}
          
          <button 
            onClick={() => {
              const newItem: Item = { id: generateId(), name: 'Item Baru', price: 0, qty: 1, sharedBy: [] };
              setBills(bills.map(b => b.id === currentBillId ? { ...b, items: [...b.items, newItem] } : b));
            }}
            className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-4 text-gray-400 font-bold flex items-center justify-center space-x-2 hover:border-indigo-200 hover:text-indigo-400 transition-all text-sm"
          >
            <Plus size={18} />
            <span>Tambah Item Manual</span>
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-12">
          <button
            onClick={() => setStep('TAX_SERVICE')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 px-6 rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-xl shadow-indigo-200"
          >
            <span>Pajak & Layanan</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </motion.div>
    );
  };

  const renderTaxService = () => {
    if (!currentBill) return null;

    const subtotal = currentBill.items.reduce((sum, item) => sum + item.price, 0);
    const taxAmount = subtotal * (parseFloat(taxPercentage) || 0) / 100;
    const serviceAmount = subtotal * (parseFloat(servicePercentage) || 0) / 100;
    const total = subtotal + taxAmount + serviceAmount;

    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex flex-col h-full bg-gray-50"
      >
        <div className="bg-white px-6 py-4 shadow-sm z-10 flex items-center space-x-4">
          <button onClick={() => setStep('ASSIGN_ITEMS')} className="text-gray-400 hover:text-gray-900 p-2 -ml-2">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Pajak & Layanan</h2>
            <p className="text-gray-500 text-sm mt-1">Sesuaikan biaya tambahan</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <span className="text-gray-500 font-medium">Subtotal Item</span>
              <span className="font-bold text-gray-900 text-lg">{formatCurrency(subtotal)}</span>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Biaya Layanan (%)</label>
                <div className="text-indigo-600 font-bold">{formatCurrency(serviceAmount)}</div>
              </div>
              <input
                type="number"
                value={servicePercentage}
                onFocus={(e) => { if (parseFloat(servicePercentage) === 0) e.target.select(); }}
                onChange={(e) => setServicePercentage(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500 transition-colors text-lg font-medium"
                placeholder="0"
                step="0.1"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Pajak (%)</label>
                <div className="text-indigo-600 font-bold">{formatCurrency(taxAmount)}</div>
              </div>
              <input
                type="number"
                value={taxPercentage}
                onFocus={(e) => { if (parseFloat(taxPercentage) === 0) e.target.select(); }}
                onChange={(e) => setTaxPercentage(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500 transition-colors text-lg font-medium"
                placeholder="0"
                step="0.1"
              />
            </div>

            <div className="pt-6 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">Total Akhir</span>
                <span className="font-black text-2xl text-indigo-600">{formatCurrency(total)}</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                *Biaya tambahan akan dibagi secara proporsional berdasarkan total belanja masing-masing.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-gray-100">
          <button
            onClick={() => {
              setBills(bills.map(b => b.id === currentBillId ? {
                ...b,
                subtotal,
                tax: taxAmount,
                serviceCharge: serviceAmount,
                total
              } : b));
              setStep('PAYMENTS');
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 px-6 rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-xl shadow-indigo-200"
          >
            <span>Siapa yang Bayar?</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </motion.div>
    );
  };

  const renderPayments = () => {
    if (bills.length === 0) return null;

    const totalBill = bills.reduce((sum, b) => sum + b.total, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = totalBill - totalPaid;

    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex flex-col h-full bg-gray-50"
      >
        <div className="bg-white px-6 py-4 shadow-sm z-10 flex items-center space-x-4">
          <button onClick={() => setStep('TAX_SERVICE')} className="text-gray-400 hover:text-gray-900 p-2 -ml-2">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Pembayaran</h2>
            <p className="text-gray-500 text-sm mt-1">Siapa yang membayar tagihan?</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Total Tagihan</span>
              <span className="font-bold text-gray-900">{formatCurrency(totalBill)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Total Dibayar</span>
              <span className="font-bold text-emerald-600">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <span className="font-bold text-gray-900">Sisa</span>
              <span className={`font-black text-xl ${remaining > 0.01 ? 'text-red-500' : 'text-emerald-600'}`}>
                {remaining > 0.01 ? formatCurrency(remaining) : 'Lunas!'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider px-1">Tambah Pembayaran</h3>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {people.map(person => (
                  <button
                    key={person.id}
                    onClick={() => {
                      const amount = remaining > 0 ? remaining : 0;
                      setPayments([...payments, { id: generateId(), personId: person.id, amount, note: 'Bayar' }]);
                    }}
                    className={`flex items-center space-x-3 p-3 rounded-2xl border-2 transition-all active:scale-95 ${person.color.replace('bg-', 'border-').replace('500', '100')} hover:bg-gray-50`}
                  >
                    <div className={`w-8 h-8 rounded-full ${person.color} flex items-center justify-center text-white font-bold text-xs`}>
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-gray-700 text-sm truncate">{person.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider px-1">Riwayat Pembayaran</h3>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200 text-sm">
                Belum ada pembayaran tercatat.
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map(payment => {
                  const person = people.find(p => p.id === payment.personId);
                  return (
                    <div key={payment.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full ${person?.color} flex items-center justify-center text-white font-bold text-xs`}>
                          {person?.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{person?.name}</div>
                          <input 
                            type="text"
                            value={payment.note}
                            onChange={(e) => {
                              setPayments(payments.map(p => p.id === payment.id ? { ...p, note: e.target.value } : p));
                            }}
                            className="text-xs text-gray-400 bg-transparent focus:outline-none focus:text-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="flex items-center text-sm font-black text-gray-900">
                            <span className="text-[10px] mr-1">Rp.</span>
                            <input 
                              type="number"
                              value={payment.amount}
                              onFocus={(e) => { if (payment.amount === 0) e.target.select(); }}
                              onChange={(e) => {
                                setPayments(payments.map(p => p.id === payment.id ? { ...p, amount: parseFloat(e.target.value) || 0 } : p));
                              }}
                              className="bg-transparent w-20 text-right focus:outline-none focus:text-indigo-500"
                            />
                          </div>
                        </div>
                        <button 
                          onClick={() => setPayments(payments.filter(p => p.id !== payment.id))}
                          className="text-gray-300 hover:text-red-500 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-white border-t border-gray-100">
          <button
            onClick={() => setStep('SUMMARY')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 px-6 rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-xl shadow-indigo-200"
          >
            <span>Lihat Hasil Akhir</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </motion.div>
    );
  };

  const handleDownload = async () => {
    if (!shareRef.current) return;
    setIsSharing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(shareRef.current, {
        backgroundColor: '#f9fafb',
        scale: 3,
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `splitbill-summary-${new Date().getTime()}.png`;
      link.click();
    } catch (err) {
      console.error('Failed to download:', err);
      alert('Gagal mengunduh gambar.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleNativeShare = async () => {
    if (!shareRef.current) return;
    setIsSharing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(shareRef.current, {
        backgroundColor: '#f9fafb',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to create blob');
      
      const file = new File([blob], 'splitbill-summary.png', { type: 'image/png' });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Splitbill Summary',
          text: 'Berikut adalah rincian pembagian tagihan kita.'
        });
      } else {
        // Fallback to download if share is not supported
        handleDownload();
      }
    } catch (err) {
      console.error('Failed to share:', err);
      // Fallback to download
      handleDownload();
    } finally {
      setIsSharing(false);
    }
  };

  const renderShareableView = (totals: any[]) => {
    const settlements = calculateSettlements(totals);
    const totalBill = bills.reduce((sum, b) => sum + b.total, 0);
    
    // Inline styles to avoid Tailwind's oklch colors which break html2canvas
    const styles = {
      container: {
        position: 'fixed' as const,
        left: '-9999px',
        top: '0',
        width: '450px',
        padding: '40px',
        backgroundColor: HEX_COLORS['bg-gray-50'],
        color: HEX_COLORS['text-gray-900'],
        fontFamily: 'sans-serif',
      },
      header: {
        textAlign: 'center' as const,
        marginBottom: '32px',
      },
      iconContainer: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '12px',
      },
      iconBg: {
        backgroundColor: HEX_COLORS['bg-indigo-600'],
        padding: '12px',
        borderRadius: '16px',
        boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.2)',
      },
      title: {
        fontSize: '30px',
        fontWeight: '900',
        letterSpacing: '-0.025em',
        margin: '0',
        color: HEX_COLORS['text-gray-900'],
      },
      subtitle: {
        fontSize: '12px',
        fontWeight: '500',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.2em',
        color: HEX_COLORS['text-gray-400'],
        margin: '4px 0',
      },
      divider: {
        height: '4px',
        width: '48px',
        backgroundColor: HEX_COLORS['bg-indigo-600'],
        margin: '12px auto',
        borderRadius: '9999px',
      },
      section: {
        marginBottom: '32px',
      },
      sectionTitle: {
        fontSize: '10px',
        fontWeight: '700',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
        color: HEX_COLORS['text-gray-400'],
        padding: '0 4px',
        marginBottom: '16px',
      },
      card: {
        backgroundColor: HEX_COLORS['bg-white'],
        borderRadius: '32px',
        padding: '32px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        border: '1px solid #f3f4f6',
      },
      settlementItem: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        backgroundColor: HEX_COLORS['bg-indigo-50'],
        borderRadius: '16px',
        marginBottom: '12px',
      },
      tableContainer: {
        backgroundColor: HEX_COLORS['bg-white'],
        borderRadius: '32px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        border: '1px solid #f3f4f6',
      },
      table: {
        width: '100%',
        textAlign: 'left' as const,
        borderCollapse: 'collapse' as const,
      },
      th: {
        padding: '20px 32px',
        fontSize: '10px',
        fontWeight: '700',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        color: HEX_COLORS['text-gray-400'],
        backgroundColor: '#fcfcfd',
        borderBottom: '1px solid #f3f4f6',
      },
      td: {
        padding: '20px 32px',
        borderBottom: '1px solid #f9fafb',
      },
      footer: {
        textAlign: 'center' as const,
        paddingTop: '24px',
        opacity: '0.3',
      }
    };
    
    return (
      <div ref={shareRef} style={styles.container}>
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <div style={styles.iconBg}>
              <Receipt size={32} style={{ color: HEX_COLORS['text-white'] }} />
            </div>
          </div>
          <h1 style={styles.title}>Splitbill</h1>
          <p style={styles.subtitle}>Ringkasan Pembagian</p>
          <div style={styles.divider}></div>
        </div>

        {settlements.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Penyelesaian</h2>
            <div style={styles.card}>
              {settlements.map((s, i) => (
                <div key={i} style={{...styles.settlementItem, marginBottom: i === settlements.length - 1 ? '0' : '12px'}}>
                  <div style={{display: 'flex', alignItems: 'center'}}>
                    <span style={{fontWeight: '700', color: HEX_COLORS['text-gray-900']}}>{s.from}</span>
                    <ChevronRight size={16} style={{ color: HEX_COLORS['text-indigo-400'], margin: '0 8px' }} />
                    <span style={{fontWeight: '700', color: HEX_COLORS['text-gray-900']}}>{s.to}</span>
                  </div>
                  <div style={{fontWeight: '900', color: HEX_COLORS['text-indigo-600']}}>{formatCurrency(s.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Total Per Orang</h2>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nama</th>
                  <th style={{...styles.th, textAlign: 'right'}}>Total</th>
                </tr>
              </thead>
              <tbody>
                {totals.map((person, i) => (
                  <tr key={person.id}>
                    <td style={{...styles.td, borderBottom: i === totals.length - 1 ? 'none' : '1px solid #f9fafb'}}>
                      <div style={{display: 'flex', alignItems: 'center'}}>
                        <div 
                          style={{ 
                            width: '12px', 
                            height: '12px', 
                            borderRadius: '9999px', 
                            backgroundColor: HEX_COLORS[person.color] || '#000',
                            marginRight: '16px',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                          }}
                        ></div>
                        <span style={{fontWeight: '700', color: HEX_COLORS['text-gray-900']}}>{person.name}</span>
                      </div>
                    </td>
                    <td style={{...styles.td, textAlign: 'right', fontWeight: '900', color: HEX_COLORS['text-indigo-600'], borderBottom: i === totals.length - 1 ? 'none' : '1px solid #f9fafb'}}>
                      {formatCurrency(person.finalTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: HEX_COLORS['bg-indigo-600'], color: HEX_COLORS['text-white'] }}>
                  <td style={{padding: '24px 32px', fontWeight: '700'}}>Total Keseluruhan</td>
                  <td style={{padding: '24px 32px', textAlign: 'right', fontWeight: '900', fontSize: '20px'}}>
                    {formatCurrency(totalBill)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div style={styles.footer}>
          <p style={{fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3em', color: HEX_COLORS['text-gray-400']}}>Dibuat dengan Splitbill App</p>
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    const totals = calculatePersonTotals();
    const totalBill = bills.reduce((sum, b) => sum + b.total, 0);
    
    // Check if all items are assigned across all bills
    const unassignedItemsCount = bills.reduce((sum, b) => sum + b.items.filter(i => i.sharedBy.length === 0).length, 0);
    const hasUnassigned = unassignedItemsCount > 0;

    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex flex-col h-full bg-gray-50"
      >
        <div className="bg-white px-6 py-4 shadow-sm z-10 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => setStep('PAYMENTS')} className="text-gray-400 hover:text-gray-900 p-2 -ml-2">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Hasil Akhir</h2>
              <p className="text-gray-500 text-sm mt-1">Ringkasan pembagian biaya</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleDownload}
              disabled={isSharing}
              className="bg-gray-100 text-gray-700 p-3 rounded-2xl shadow-sm active:scale-95 transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              <Download size={18} />
              <span className="text-xs font-bold hidden sm:inline">Download</span>
            </button>
            <button 
              onClick={handleNativeShare}
              disabled={isSharing}
              className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {isSharing ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
              <span className="text-xs font-bold hidden sm:inline">Share</span>
            </button>
          </div>
        </div>

        {renderShareableView(totals)}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {hasUnassigned && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-5 rounded-3xl shadow-lg shadow-red-100 flex flex-col space-y-3"
            >
              <div className="flex items-start space-x-4">
                <div className="bg-red-100 p-3 rounded-2xl text-red-600">
                  <AlertCircle size={28} />
                </div>
                <div>
                  <p className="font-black text-lg leading-tight">Ada Item Belum Dibagi!</p>
                  <p className="text-red-700 text-sm mt-1">Ada {unassignedItemsCount} item yang belum dibagikan ke siapapun. Total tagihan mungkin tidak akurat.</p>
                </div>
              </div>
              <div className="pt-2">
                <button 
                  onClick={() => {
                    // Find the first bill with unassigned items and go there
                    const billWithUnassigned = bills.find(b => b.items.some(i => i.sharedBy.length === 0));
                    if (billWithUnassigned) {
                      setCurrentBillId(billWithUnassigned.id);
                      setStep('ASSIGN_ITEMS');
                    }
                  }}
                  className="w-full bg-red-600 text-white font-bold py-3 rounded-xl text-sm shadow-md active:scale-95 transition-transform"
                >
                  Bagi Item Sekarang
                </button>
              </div>
            </motion.div>
          )}

          <div className="space-y-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider px-1">Penyelesaian</h3>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
              {calculateSettlements(totals).length === 0 ? (
                <div className="text-center py-4 text-gray-500 font-medium">
                  Semua sudah lunas! 🎉
                </div>
              ) : (
                <div className="space-y-4">
                  {calculateSettlements(totals).map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-indigo-50 rounded-2xl">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gray-900 text-sm">{s.from}</span>
                        <ChevronRight size={14} className="text-indigo-400" />
                        <span className="font-bold text-gray-900 text-sm">{s.to}</span>
                      </div>
                      <div className="font-black text-indigo-600 text-sm">{formatCurrency(s.amount)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider px-1">Rincian Per Orang</h3>
            <div className="space-y-4">
              {totals.map(person => (
                <motion.div 
                  layout
                  key={person.id} 
                  className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-2 ${person.color}`}></div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full ${person.color} flex items-center justify-center text-white font-bold text-lg shadow-inner`}>
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <h3 className="font-black text-xl text-gray-900">{person.name}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-indigo-600">
                        {formatCurrency(person.finalTotal)}
                      </div>
                      <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${person.balance > 0.01 ? 'text-emerald-500' : person.balance < -0.01 ? 'text-red-500' : 'text-gray-400'}`}>
                        {person.balance > 0.01 ? `Piutang ${formatCurrency(person.balance)}` : person.balance < -0.01 ? `Hutang ${formatCurrency(Math.abs(person.balance))}` : 'Lunas'}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-wider text-xs">Ringkasan Nota</h3>
            <div className="space-y-3 text-xs text-gray-500">
              {bills.map(bill => (
                <div key={bill.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{bill.name}</span>
                    <span className="text-[10px]">{bill.items.length} item</span>
                  </div>
                  <span className="font-bold text-gray-900">{formatCurrency(bill.total)}</span>
                </div>
              ))}
              <div className="flex justify-between font-black text-lg text-indigo-600 pt-4 mt-3">
                <span>Total Keseluruhan</span>
                <span>{formatCurrency(totalBill)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-gray-100 space-y-3">
          <button
            onClick={() => setStep('UPLOAD')}
            className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold py-5 px-6 rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-95"
          >
            <Plus size={20} />
            <span>Tambah Nota Lain</span>
          </button>
          <button
            onClick={() => {
              if (window.confirm('Hapus semua data dan mulai baru?')) {
                setBills([]);
                setPeople([]);
                setPayments([]);
                setCurrentBillId(null);
                setStep('UPLOAD');
                localStorage.removeItem('splitbill_state');
              }
            }}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-5 px-6 rounded-2xl transition-all active:scale-95"
          >
            Mulai Baru
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 flex justify-center font-sans overflow-hidden">
      <div className="w-full max-w-md bg-white h-screen shadow-2xl overflow-hidden relative flex flex-col">
        <AnimatePresence mode="wait">
          {step === 'RESTORE' && renderRestoreSession()}
          {step === 'UPLOAD' && renderUpload()}
          {step === 'BILL_NAME' && renderBillName()}
          {step === 'CAMERA' && renderCamera()}
          {step === 'PROCESSING' && renderProcessing()}
          {step === 'ADD_PEOPLE' && renderAddPeople()}
          {step === 'ASSIGN_ITEMS' && renderAssignItems()}
          {step === 'TAX_SERVICE' && renderTaxService()}
          {step === 'PAYMENTS' && renderPayments()}
          {step === 'SUMMARY' && renderSummary()}
        </AnimatePresence>
      </div>
    </div>
  );
}
