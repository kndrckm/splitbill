import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { AnimatePresence } from 'motion/react';
import { useBillSplit } from './hooks/useBillSplit';
import { processReceipt } from './services/aiService';
import { generateId, getApiKey } from './utils';
import { decodeShareData } from './utils/shareUtils';
import { COLORS, Step } from './types';
import { AlertCircle, Check, Share2 } from 'lucide-react';

// Steps
import { UploadStep } from './components/steps/UploadStep';
import { BillNameStep } from './components/steps/BillNameStep';
import { CameraStep } from './components/steps/CameraStep';
import { ProcessingStep } from './components/steps/ProcessingStep';
import { AssignItemsStep } from './components/steps/AssignItemsStep';
import { TaxServiceStep } from './components/steps/TaxServiceStep';
import { PaymentsStep } from './components/steps/PaymentsStep';
import { SummaryStep } from './components/steps/SummaryStep';
import { RestoreStep } from './components/steps/RestoreStep';

// UI
import { ShareableView } from './components/ui/ShareableView';
import { ApiKeyModal } from './components/ui/ApiKeyModal';

export default function App() {
  const {
    step, setStep,
    receiptImage, setReceiptImage,
    bills, setBills,
    currentBillId, setCurrentBillId,
    people, setPeople,
    payments, setPayments,
    taxPercentage, setTaxPercentage,
    servicePercentage, setServicePercentage,
    darkMode, setDarkMode,
    currentBill,
    formatCurrency,
    calculatePersonTotals,
    sharedSession
  } = useBillSplit();

  const { isLockedByOther, isLockedByMe, isConnected, sessionId, lockedBy } = sharedSession;
  const isInputDisabled = isLockedByOther;

  const [newPersonName, setNewPersonName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingState, setPendingState] = useState<any>(null);
  const [previousStep, setPreviousStep] = useState<Step | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [pendingImageDataUrl, setPendingImageDataUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleSetStep = (newStep: any) => {
    setPreviousStep(step);
    setStep(newStep);
  };

  const handleBillNameBack = () => {
    if (previousStep === 'SUMMARY') {
      setStep('SUMMARY');
    } else {
      if (window.confirm('Keluar dari sesi ini? Data yang belum tersimpan mungkin hilang.')) {
        setStep('UPLOAD');
      }
    }
  };

  useEffect(() => {
    // 1. Try to load from URL share link
    const queryParams = new URLSearchParams(window.location.search);
    const shareData = queryParams.get('share');

    if (shareData) {
      const decoded = decodeShareData(shareData);
      if (decoded && decoded.bills && decoded.people) {
        setBills(decoded.bills);
        setPeople(decoded.people);
        if (decoded.payments) setPayments(decoded.payments);

        // Clean up URL to hide the long base64 string
        window.history.replaceState({}, document.title, window.location.pathname);

        setStep('SUMMARY');
        setIsInitialized(true);
        return;
      }
    }

    // 2. Fallback to localStorage
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
        setIsInitialized(true);
      }
    } else {
      setIsInitialized(true);
    }
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      handleSetStep('CAMERA');
    } catch (err) {
      setError('Gagal mengakses kamera.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    handleSetStep('UPLOAD');
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setReceiptImage(dataUrl);
        stopCamera();
        handleProcessReceipt(dataUrl);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setReceiptImage(dataUrl);
        handleProcessReceipt(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessReceipt = async (dataUrl: string) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      // Save the pending image and show API key modal
      setPendingImageDataUrl(dataUrl);
      setShowApiKeyModal(true);
      return;
    }

    handleSetStep('PROCESSING');
    setError(null);
    try {
      const base64Data = dataUrl.split(',')[1];
      const mimeType = dataUrl.split(';')[0].split(':')[1];

      const parsedData = await processReceipt(base64Data, mimeType, apiKey);

      let initialTaxPct = 0;
      let initialServicePct = 0;
      if (parsedData.subtotal > 0) {
        initialTaxPct = (parsedData.tax / parsedData.subtotal) * 100;
        initialServicePct = (parsedData.serviceCharge / parsedData.subtotal) * 100;
      }

      setTaxPercentage(initialTaxPct.toFixed(2));
      setServicePercentage(initialServicePct.toFixed(2));
      setBills(prev => [...prev, parsedData]);
      setCurrentBillId(parsedData.id);

      if (people.length === 0) {
        setPeople([{ id: generateId(), name: 'Saya', color: COLORS[0] }]);
      }
      handleSetStep('BILL_NAME');
    } catch (err: any) {
      setError(err.message || 'Gagal memproses nota. Periksa API key Anda.');
      handleSetStep('UPLOAD');
    }
  };

  const handleApiKeySaved = (key: string) => {
    setShowApiKeyModal(false);
    // If there was a pending image, process it now
    if (pendingImageDataUrl) {
      const dataUrl = pendingImageDataUrl;
      setPendingImageDataUrl(null);
      handleProcessReceipt(dataUrl);
    }
  };

  const handleManualInput = () => {
    const billId = generateId();
    const newBill = {
      id: billId,
      name: 'Nota Baru',
      items: [],
      subtotal: 0,
      tax: 0,
      serviceCharge: 0,
      total: 0,
    };
    setBills(prev => [...prev, newBill]);
    setCurrentBillId(billId);
    if (people.length === 0) {
      setPeople([{ id: generateId(), name: 'Saya', color: COLORS[0] }]);
    }
    handleSetStep('BILL_NAME');
  };

  const handleJoinSession = async (code: string) => {
    if (!code.trim()) return;
    setError(null);
    try {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('session', code);
      window.location.href = currentUrl.toString();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const addPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    const newPerson = { id: generateId(), name: newPersonName.trim(), color: COLORS[people.length % COLORS.length] };
    setPeople([...people, newPerson]);
    setNewPersonName('');
  };

  const removePerson = (id: string) => {
    setPeople(people.filter(p => p.id !== id));
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
                sharedBy: isShared ? item.sharedBy.filter(id => id !== personId) : [...item.sharedBy, personId]
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
              return { ...item, sharedBy: isAllSelected ? [] : [...allPersonIds] };
            }
            return item;
          })
        };
      }
      return bill;
    }));
  };

  const handleShare = async () => {
    if (!shareRef.current) return;
    setIsSharing(true);
    try {
      const canvas = await html2canvas(shareRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob && navigator.share) {
        const file = new File([blob], 'splitbill-summary.png', { type: 'image/png' });
        await navigator.share({ files: [file], title: 'SplitBill Summary', text: 'Ini rincian bagi tagihan kita!' });
      } else if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'splitbill-summary.png';
        a.click();
      }
    } catch (err) {
      console.error('Failed to share:', err);
      setError('Gagal membagikan gambar.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    if (!shareRef.current) return;
    try {
      const canvas = await html2canvas(shareRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = 'splitbill-summary.png';
      a.click();
    } catch (err) {
      console.error('Failed to download:', err);
      setError('Gagal mengunduh gambar.');
    }
  };

  const totals = calculatePersonTotals();
  const totalBill = bills.reduce((sum, b) => sum + b.total, 0);

  return (
    <div className="min-h-screen bg-gray-900 dark:bg-black flex justify-center font-sans overflow-hidden">
      <div className="w-full max-w-md bg-white dark:bg-gray-950 h-screen shadow-2xl overflow-hidden relative flex flex-col">
        { /* Shared Session Banner Display logic */}
        {step !== 'RESTORE' && sessionId && (
          <div className="w-full z-50">
            <div className={`px-4 py-3 text-sm font-bold flex items-center justify-between ${isLockedByOther ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
              <div className="flex items-center space-x-2">
                {isLockedByOther ? <AlertCircle size={16} /> : <Check size={16} />}
                <span>
                  {isLockedByOther ? 'Orang lain sedang mengedit...' : 'Anda sedang mengedit.'}
                </span>
              </div>
              {isLockedByOther ? (
                <button onClick={sharedSession.takeLock} className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs shadow-sm ml-2 whitespace-nowrap active:scale-95 transition-transform">
                  AMBIL ALIH
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(url);
                    alert('Link sesi disalin: ' + url);
                  }} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs shadow-sm ml-2 whitespace-nowrap active:scale-95 transition-transform flex items-center gap-1">
                    <Share2 size={12} /> Link
                  </button>
                  <button onClick={sharedSession.releaseLock} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs shadow-sm whitespace-nowrap active:scale-95 transition-transform">
                    LEPASKAN
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'RESTORE' && (
            <RestoreStep
              pendingState={pendingState}
              setBills={setBills}
              setPeople={setPeople}
              setPayments={setPayments}
              setStep={handleSetStep}
              setCurrentBillId={setCurrentBillId}
              setIsInitialized={setIsInitialized}
            />
          )}
          {step === 'UPLOAD' && (
            <UploadStep
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              error={error}
              startCamera={startCamera}
              handleFileUpload={handleFileUpload}
              handleManualInput={handleManualInput}
              fileInputRef={fileInputRef}
              handleJoinSession={handleJoinSession}
              onOpenApiKeyModal={() => setShowApiKeyModal(true)}
              isInputDisabled={isInputDisabled}
            />
          )}
          {step === 'BILL_NAME' && (
            <BillNameStep
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              currentBill={currentBill}
              setBills={setBills}
              bills={bills}
              setStep={handleSetStep}
              people={people}
              setPeople={setPeople}
              newPersonName={newPersonName}
              setNewPersonName={setNewPersonName}
              addPerson={addPerson}
              removePerson={removePerson}
              onBack={handleBillNameBack}
              isInputDisabled={isInputDisabled}
            />
          )}
          {step === 'CAMERA' && (
            <CameraStep
              videoRef={videoRef}
              stopCamera={stopCamera}
              takePhoto={takePhoto}
            />
          )}
          {step === 'PROCESSING' && (
            <ProcessingStep receiptImage={receiptImage} />
          )}
          {step === 'ASSIGN_ITEMS' && (
            <AssignItemsStep
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              currentBill={currentBill}
              people={people}
              setBills={setBills}
              bills={bills}
              setStep={handleSetStep}
              formatCurrency={formatCurrency}
              toggleItemShare={toggleItemShare}
              selectAllPeopleForItem={selectAllPeopleForItem}
              generateId={generateId}
              isInputDisabled={isInputDisabled}
            />
          )}
          {step === 'TAX_SERVICE' && (
            <TaxServiceStep
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              currentBill={currentBill}
              setBills={setBills}
              bills={bills}
              setStep={handleSetStep}
              formatCurrency={formatCurrency}
              taxPercentage={taxPercentage}
              setTaxPercentage={setTaxPercentage}
              servicePercentage={servicePercentage}
              setServicePercentage={setServicePercentage}
              isInputDisabled={isInputDisabled}
            />
          )}
          {step === 'PAYMENTS' && (
            <PaymentsStep
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              people={people}
              payments={payments}
              setPayments={setPayments}
              setStep={handleSetStep}
              formatCurrency={formatCurrency}
              totalBill={totalBill}
              generateId={generateId}
              isInputDisabled={isInputDisabled}
            />
          )}
          {step === 'SUMMARY' && (
            <SummaryStep
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              bills={bills}
              people={people}
              payments={payments}
              setBills={setBills}
              setPeople={setPeople}
              setPayments={setPayments}
              setStep={handleSetStep}
              setCurrentBillId={setCurrentBillId}
              formatCurrency={formatCurrency}
              totalBill={totalBill}
              totals={totals}
              shareRef={shareRef}
              handleShare={handleShare}
              handleDownload={handleDownload}
              isSharing={isSharing}
              setTaxPercentage={setTaxPercentage}
              setServicePercentage={setServicePercentage}
              sessionId={sharedSession.sessionId}
              isInputDisabled={isInputDisabled}
            />
          )}
        </AnimatePresence>
        <canvas ref={canvasRef} className="hidden" />
        <ShareableView
          shareRef={shareRef}
          bills={bills}
          people={people}
          totals={totals}
          formatCurrency={formatCurrency}
          totalBill={totalBill}
        />
      </div>
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onKeySaved={handleApiKeySaved}
      />
    </div>
  );
}
