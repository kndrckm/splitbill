import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useBillSplit } from './hooks/useBillSplit';
import { processReceipt } from './services/aiService';
import { getApiKey } from './utils';
import { renderSummaryCanvas } from './utils/shareUtils';
import { AppState } from './types';

// Step components
import { UploadStep } from './components/steps/UploadStep';
import { BillNameStep } from './components/steps/BillNameStep';
import { CameraStep } from './components/steps/CameraStep';
import { ProcessingStep } from './components/steps/ProcessingStep';
import { AssignItemsStep } from './components/steps/AssignItemsStep';
import { TaxServiceStep } from './components/steps/TaxServiceStep';
import { PaymentsStep } from './components/steps/PaymentsStep';
import { SummaryStep } from './components/steps/SummaryStep';
import { RestoreStep } from './components/steps/RestoreStep';

// UI components
import { ApiKeyModal } from './components/ui/ApiKeyModal';

export default function App() {
  const {
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
    handleImageUpload,
    handleProcessingComplete,
    handleReset,
    formatCurrency,
    calculatePersonTotals,
    sharedSession,
  } = useBillSplit();

  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Dark mode class on root
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // -- Camera helpers ---------------------------------------------------------
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStep('CAMERA');
    } catch (err) {
      alert('Tidak bisa mengakses kamera. Pastikan izin kamera sudah diberikan.');
    }
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStep('UPLOAD');
  }, [setStep]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    setReceiptImage(dataUrl);
    setStep('PROCESSING');
  }, [stopCamera, setReceiptImage, setStep]);

  // -- AI processing ----------------------------------------------------------
  const runProcessing = useCallback(async (imageDataUrl: string) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    setProcessingError(null);
    setStep('PROCESSING');
    try {
      const [, base64] = imageDataUrl.split(',');
      const mimeType = imageDataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
      const data = await processReceipt(base64, mimeType, apiKey);
      handleProcessingComplete(data);
    } catch (err: any) {
      setProcessingError(err?.message || 'Terjadi kesalahan saat membaca struk.');
    }
  }, [setStep, handleProcessingComplete]);

  // Run processing automatically when image is set and step is PROCESSING
  useEffect(() => {
    if (step === 'PROCESSING' && receiptImage && !processingError) {
      runProcessing(receiptImage);
    }
  }, [step, receiptImage]);

  // -- Share / Download -------------------------------------------------------
  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const totals = calculatePersonTotals();
      const totalBill = bills.reduce((s, b) => s + b.total, 0);
      const blob = await renderSummaryCanvas(totals, formatCurrency, totalBill);
      const file = new File([blob], 'splitbill-summary.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Split Bill Summary' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'splitbill-summary.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Share failed', err);
    } finally {
      setIsSharing(false);
    }
  };

  // -- Restore callbacks ------------------------------------------------------
  const handleRestore = useCallback((state: AppState) => {
    if (state.bills) setBills(state.bills);
    if (state.people) setPeople(state.people);
    if (state.payments) setPayments(state.payments);
    if (state.currentBillId !== undefined) setCurrentBillId(state.currentBillId);
    setStep(state.step || 'SUMMARY');
  }, [setBills, setPeople, setPayments, setCurrentBillId, setStep]);

  // -- Computed ---------------------------------------------------------------
  const personTotals = calculatePersonTotals();
  const totalBill = bills.reduce((s, b) => s + b.total, 0);
  const isInputDisabled = sharedSession.isLockedByOther;

  // Pending state from localStorage for RestoreStep
  const [pendingRestoreState, setPendingRestoreState] = useState<AppState | null>(null);
  useEffect(() => {
    if (step === 'RESTORE') {
      try {
        const saved = localStorage.getItem('splitbill_state');
        if (saved) setPendingRestoreState(JSON.parse(saved));
      } catch (e) { /* ignore */ }
    }
  }, [step]);

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center`}>
      <div className="w-full max-w-sm h-[100dvh] relative overflow-hidden bg-white dark:bg-gray-950 shadow-2xl">

        {/* Session Not Found Modal */}
        <AnimatePresence>
          {sharedSession.sessionNotFound && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 space-y-4 shadow-2xl w-full max-w-xs"
              >
                <h3 className="font-black text-gray-900 dark:text-white text-lg">Sesi Tidak Ditemukan</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                  Link sesi ini sudah kedaluwarsa atau tidak valid. Buat sesi baru untuk berbagi dengan teman.
                </p>
                <button
                  onClick={() => {
                    // Clear session param and reset
                    const url = new URL(window.location.href);
                    url.searchParams.delete('session');
                    window.history.replaceState({}, '', url);
                    handleReset();
                  }}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold"
                >
                  Mulai Baru
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* API Key Modal */}
        <ApiKeyModal
          isOpen={isApiKeyModalOpen}
          onClose={() => setIsApiKeyModalOpen(false)}
          onKeySaved={(key) => {
            setIsApiKeyModalOpen(false);
            if (receiptImage) runProcessing(receiptImage);
          }}
        />

        {/* Main step router */}
        <AnimatePresence mode="wait">
          {step === 'RESTORE' && (
            <RestoreStep
              key="restore"
              pendingState={pendingRestoreState}
              onRestore={handleRestore}
              onReset={handleReset}
            />
          )}

          {step === 'UPLOAD' && (
            <UploadStep
              key="upload"
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              onImageUpload={handleImageUpload}
              onCameraOpen={startCamera}
              onApiKeyOpen={() => setIsApiKeyModalOpen(true)}
              bills={bills}
              setStep={setStep}
              sharedSession={sharedSession}
              formatCurrency={formatCurrency}
            />
          )}

          {step === 'BILL_NAME' && (
            <BillNameStep
              key="bill-name"
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              bills={bills}
              setBills={setBills}
              currentBillId={currentBillId}
              setStep={setStep}
              isInputDisabled={isInputDisabled}
            />
          )}

          {step === 'CAMERA' && (
            <CameraStep
              key="camera"
              videoRef={videoRef}
              stopCamera={stopCamera}
              takePhoto={takePhoto}
            />
          )}

          {step === 'PROCESSING' && (
            <ProcessingStep
              key="processing"
              receiptImage={receiptImage}
              error={processingError}
              onRetry={() => {
                setProcessingError(null);
                if (receiptImage) runProcessing(receiptImage);
              }}
            />
          )}

          {step === 'ASSIGN_ITEMS' && (
            <AssignItemsStep
              key="assign"
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              currentBill={currentBill}
              setBills={setBills}
              bills={bills}
              people={people}
              setPeople={setPeople}
              setStep={setStep}
              formatCurrency={formatCurrency}
              isInputDisabled={isInputDisabled}
            />
          )}

          {step === 'TAX_SERVICE' && (
            <TaxServiceStep
              key="tax"
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              currentBill={currentBill}
              setBills={setBills}
              bills={bills}
              setStep={setStep}
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
              key="payments"
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              people={people}
              payments={payments}
              setPayments={setPayments}
              setStep={setStep}
              formatCurrency={formatCurrency}
              totalBill={totalBill}
              isInputDisabled={isInputDisabled}
            />
          )}

          {step === 'SUMMARY' && (
            <SummaryStep
              key="summary"
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              bills={bills}
              people={people}
              payments={payments}
              personTotals={personTotals}
              setStep={setStep}
              formatCurrency={formatCurrency}
              totalBill={totalBill}
              onShare={handleShare}
              isSharing={isSharing}
              onReset={handleReset}
              sharedSession={sharedSession}
              isInputDisabled={isInputDisabled}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
