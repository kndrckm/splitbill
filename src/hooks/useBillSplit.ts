import { useState, useEffect } from 'react';
import { Step, ReceiptData, Person, Payment, DistributionMode } from '../types';

export const useBillSplit = () => {
  const [step, setStep] = useState<Step>('UPLOAD');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [bills, setBills] = useState<ReceiptData[]>([]);
  const [currentBillId, setCurrentBillId] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [taxPercentage, setTaxPercentage] = useState<string>('0');
  const [servicePercentage, setServicePercentage] = useState<string>('0');
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('PROPORTIONAL');
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRemoteUpdate, setIsRemoteUpdate] = useState(false);

  const currentBill = bills.find(b => b.id === currentBillId);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('splitbill_state');
    const savedTheme = localStorage.getItem('splitbill_theme');
    
    if (savedTheme === 'dark') setDarkMode(true);
    else if (savedTheme === 'light') setDarkMode(false);
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setDarkMode(true);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.bills) setBills(parsed.bills);
        if (parsed.people) setPeople(parsed.people);
        if (parsed.payments) setPayments(parsed.payments);
        if (parsed.step) setStep(parsed.step);
        if (parsed.currentBillId) setCurrentBillId(parsed.currentBillId);
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // WebSocket Sync
  useEffect(() => {
    if (!currentBillId || !isInitialized) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'join', roomId: currentBillId }));
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'update') {
          setIsRemoteUpdate(true);
          const { bills: remoteBills, people: remotePeople, payments: remotePayments } = payload.data;
          if (remoteBills) setBills(remoteBills);
          if (remotePeople) setPeople(remotePeople);
          if (remotePayments) setPayments(remotePayments);
          setTimeout(() => setIsRemoteUpdate(false), 50);
        }
      } catch (e) {
        console.error('WS Message Error:', e);
      }
    };

    const broadcast = () => {
      if (socket.readyState === WebSocket.OPEN && !isRemoteUpdate) {
        socket.send(JSON.stringify({
          type: 'update',
          data: { bills, people, payments }
        }));
      }
    };

    // Debounce broadcast
    const timeout = setTimeout(broadcast, 500);
    return () => {
      clearTimeout(timeout);
      socket.close();
    };
  }, [bills, people, payments, currentBillId, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('splitbill_state', JSON.stringify({ bills, people, payments, step, currentBillId }));
    }
  }, [bills, people, payments, step, currentBillId, isInitialized]);

  useEffect(() => {
    localStorage.setItem('splitbill_theme', darkMode ? 'dark' : 'light');
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculatePersonTotals = () => {
    const personTotals: Record<string, {
      itemTotal: number,
      taxShare: number,
      serviceShare: number,
      finalTotal: number
    }> = {};

    people.forEach(p => {
      personTotals[p.id] = { itemTotal: 0, taxShare: 0, serviceShare: 0, finalTotal: 0 };
    });

    bills.forEach(bill => {
      let billAssignedSubtotal = 0;
      const billPersonItemTotals: Record<string, number> = {};
      people.forEach(p => billPersonItemTotals[p.id] = 0);

      bill.items.forEach(item => {
        if (item.sharedBy.length > 0) {
          const itemTotalValue = item.price * item.qty;
          const splitPrice = itemTotalValue / item.sharedBy.length;
          item.sharedBy.forEach(personId => {
            if (billPersonItemTotals[personId] !== undefined) billPersonItemTotals[personId] += splitPrice;
          });
          billAssignedSubtotal += itemTotalValue;
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

  return {
    step, setStep,
    receiptImage, setReceiptImage,
    bills, setBills,
    currentBillId, setCurrentBillId,
    people, setPeople,
    payments, setPayments,
    taxPercentage, setTaxPercentage,
    servicePercentage, setServicePercentage,
    distributionMode, setDistributionMode,
    darkMode, setDarkMode,
    currentBill,
    formatCurrency,
    calculatePersonTotals
  };
};
