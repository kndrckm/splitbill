import React from 'react';
import { motion } from 'motion/react';
import { Receipt, Camera, Upload, Plus, Key } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { hasApiKey } from '../../utils';

type UploadStepProps = {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  error: string | null;
  startCamera: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleManualInput: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onOpenApiKeyModal: () => void;
  handleJoinSession: (code: string) => void;
  isInputDisabled?: boolean;
  sessionId?: string | null;
};

export const UploadStep: React.FC<UploadStepProps> = ({
  darkMode, setDarkMode, error, startCamera, handleFileUpload, handleManualInput, fileInputRef, onOpenApiKeyModal, handleJoinSession, isInputDisabled, sessionId
}) => {
  const apiKeyAvailable = hasApiKey();
  const [sessionCode, setSessionCode] = React.useState('');
  const [recentSessions, setRecentSessions] = React.useState<{ id: string, timestamp: number }[]>([]);

  React.useEffect(() => {
    try {
      const historyStr = localStorage.getItem('splitbill_history');
      if (historyStr) {
        setRecentSessions(JSON.parse(historyStr));
      }
    } catch (e) { }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative flex flex-col items-center justify-between h-full p-4 sm:p-6 text-center dark:bg-gray-950 overflow-y-auto overflow-x-hidden"
    >
      <div className="absolute top-4 right-4 flex items-center space-x-1.5 z-10">
        <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
      </div>

      {/* Spacer to keep main content roughly in center */}
      <div className="h-4 shrink-0"></div>

      <div className="w-full flex flex-col items-center justify-center my-auto">
        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-3 shadow-inner shrink-0">
          <Receipt size={40} />
        </div>
        <div className="mb-4">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">SplitBill</h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-[280px] mx-auto leading-relaxed text-sm">Biar Agem bisa uninstall Line, yang ini bisa dishare link loh.</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 text-red-600 p-3 rounded-xl w-full text-xs border border-red-100 mb-4"
          >
            {error}
          </motion.div>
        )}

        <div className="w-full space-y-3">
          <button
            onClick={startCamera}
            disabled={isInputDisabled}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center space-x-3 transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            <Camera size={20} />
            <span className="text-base">Ambil Foto Nota</span>
          </button>

          <div className="flex space-x-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isInputDisabled}
              className="flex-1 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 text-sm"
            >
              <Upload size={16} />
              <span>Upload Foto</span>
            </button>
            <button
              onClick={handleManualInput}
              disabled={isInputDisabled}
              className="flex-1 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 text-sm"
            >
              <Plus size={16} />
              <span>Input Manual</span>
            </button>
          </div>

          {!sessionId && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Atau Gabung Sesi</p>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value)}
                  placeholder="Kode Sesi (e.g. a1b2c3d)"
                  className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 focus:border-indigo-500 dark:focus:border-indigo-600 py-3 px-3 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none transition-all"
                />
                <button
                  onClick={() => handleJoinSession(sessionCode)}
                  className="bg-gray-900 dark:bg-indigo-600 text-white px-4 rounded-xl font-bold text-sm active:scale-95 transition-all shrink-0"
                >
                  Gabung
                </button>
              </div>

              {recentSessions.length > 0 && (
                <div className="mt-5 text-left">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">Sesi Terakhir Anda</p>
                  <div className="flex flex-col space-y-2">
                    {recentSessions.map((hist) => (
                      <button
                        key={hist.id}
                        onClick={() => handleJoinSession(hist.id)}
                        className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/50 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-800 py-2 px-3 rounded-xl transition-colors active:scale-95"
                      >
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          Sesi <span className="text-indigo-500">#{hist.id.substring(0, 5)}</span>
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {new Date(hist.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>

      <div className="shrink-0 mt-4 pb-2 z-10 w-full text-center">
        <p className="text-[10px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-[0.2em]">
          Version 1.3.0 • Last updated: March 2, 2026
        </p>
      </div>
    </motion.div>
  );
};
