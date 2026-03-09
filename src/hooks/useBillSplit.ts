import { useState, useEffect, useMemo } from 'react';
import { Step, ReceiptData, Person, Payment, AppState } from '../types';
import { useSharedSession } from './useSharedSession';

export const useBillSplit = () => {
  const [step, setStep] = useState<Step>(() => {
    return new URLSearchParams(window.location.search).get('session') ? 'SUMMARY' : 'UPLOAD';
  });
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [bills, setBills] = useState<ReceiptData[]>([]);
  const [currentBillId, setCurrentBillId] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [taxPercentage, setTaxPercentage] = useState<number>(0);
  const [servicePercentage, setServicePercentage] = useState<number>(0);
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const currentBill = bills.find(b => b.id === currentBillId);

  // Stabilized shared state object (only re-creates when content changes)
  const sharedState = useMemo<AppState>(() => ({
    bills,
    people,
    payments,
    currentBillId,
    step,
  }), [bills, people, payments, currentBillId, step]);

  const sharedSession = useSharedSession(sharedState);

  // Sync state FROM Firebase when another user is editing
  useEffect(() => {
    const newState = sharedSession.incomingState;
    if (!newState) return;
    if (newState.bills) setBills(newState.bills);
    if (newState.people) setPeople(newState.people);
    if (newState.payments) setPayments(newState.payments);
    if (newState.currentBillId !== undefined) setCurrentBillId(newState.currentBillId);
    if (newState.step && newState.step !== 'RESTORE' && step !== 'RESTORE') {
      setStep(newState.step as Step);
    }
  }, [sharedSession.incomingState]);

  // Persistence -- load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('splitbill_state');
    const savedTheme = localStorage.getItem('splitbill_theme');

    if (savedTheme === 'dark') setDarkMode(true);
    else if (savedTheme === 'light') setDarkMode(false);
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setDarkMode(true);

    if (new URLSearchParams(window.location.search).get('session')) {
      setIsInitialized(true);
      return;
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.bills) setBills(parsed.bills);
        if (parsed.people) setPeople(parsed.people);
        if (parsed.payments) setPayments(parsed.payments);
        if (parsed.step) setStep(parsed.step);
        if (parsed.currentBillId) setCurrentBillId(parsed.currentBillId);
        if (parsed.taxPercentage !== undefined) setTaxPercentage(Number(parsed.taxPercentage) || 0);
        if (parsed.servicePercentage !== undefined) setServicePercentage(Number(parsed.servicePercentage) || 0);
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Persistence -- save to localStorage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('splitbill_state', JSON.stringify({
        bills, people, payments, step, currentBillId, taxPercentage, servicePercentage
      }));
    }
  }, [bills, people, payments, step, currentBillId, taxPercentage, servicePercentage, isInitialized]);

  // Theme persistence
  useEffect(() => {
    localStorage.setItem('splitbill_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setReceiptImage(e.target?.result as string);
      setStep('PROCESSING');
    };
    reader.readAsDataURL(file);
  };

  const handleProcessingComplete = (data: ReceiptData) => {
    const newBill = { ...data, id: data.id || crypto.randomUUID() };
    setBills(prev => [...prev, newBill]);
    setCurrentBillId(newBill.id);
    setStep('TAX_SERVICE');
  };

  const handleReset = () => {
    setBills([]);
    setPeople([]);
    setPayments([]);
    setCurrentBillId(null);
    setReceiptImage(null);
    setTaxPercentage(0);
    setServicePercentage(0);
    setStep('UPLOAD');
    localStorage.removeItem('splitbill_state');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const calculatePersonTotals = () => {
    return people.map(person => {
      let total = 0;
      bills.forEach(bill => {
        bill.items.forEach(item => {
          if (item.sharedBy.includes(person.id)) {
            total += (item.price * item.qty) / item.sharedBy.length;
          }
        });
        // Add tax and service proportionally
        const billSubtotal = bill.items.reduce((s, i) => s + i.price * i.qty, 0);
        if (billSubtotal > 0) {
          const personSubtotal = bill.items
            .filter(i => i.sharedBy.includes(person.id))
            .reduce((s, i) => s + (i.price * i.qty) / i.sharedBy.length, 0);
          const ratio = personSubtotal / billSubtotal;
          total += (bill.tax + bill.serviceCharge) * ratio;
        }
      });
      const paid = payments.filter(p => p.personId === person.id).reduce((s, p) => s + p.amount, 0);
      return { ...person, total, paid, balance: paid - total };
    });
  };

  return {
    step, setStep,
    receiptImage, setReceiptImage,
    bills, setBills,
    currentBillId, setCurrentBillId,
    currentBill,
    people, setPeople,
    payments, setPayments,
    taxPercentage, setTaxPercentage,
    servicePercentage, setServicePercentage,
    darkMode, setDarkMode,
    isInitialized, setIsInitialized,
    handleImageUpload,
    handleProcessingComplete,
    handleReset,
    formatCurrency,
    calculatePersonTotals,
    sharedSession,
  };
};
