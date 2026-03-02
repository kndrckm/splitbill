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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative flex flex-col items-center justify-center h-full p-6 text-center space-y-6 dark:bg-gray-950"
    >
      <div className="absolute top-4 right-4 flex items-center space-x-1.5">
        <button
          onClick={onOpenApiKeyModal}
          className={`p-2 rounded-xl transition-colors ${apiKeyAvailable ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}
          title={apiKeyAvailable ? 'API Key tersimpan' : 'Atur API Key'}
        >
          <Key size={16} />
        </button>
        <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
      </div>
      <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-2 shadow-inner">
        <Receipt size={40} />
      </div>
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">SplitBill</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-[280px] mx-auto leading-relaxed text-sm">Biar Agem bisa uninstall Line, yang ini bisa dishare link loh.</p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 text-red-600 p-3 rounded-xl w-full text-xs border border-red-100"
        >
          {error}
        </motion.div>
      )}

      <div className="w-full space-y-3 mt-4">
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
                className="flex-1 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 focus:border-indigo-500 dark:focus:border-indigo-600 py-3 px-4 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none transition-all"
              />
              <button
                onClick={() => handleJoinSession(sessionCode)}
                className="bg-gray-900 dark:bg-indigo-600 text-white px-4 rounded-xl font-bold text-sm active:scale-95 transition-all"
              >
                Gabung
              </button>
            </div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-[10px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-[0.2em]">
            Version 1.3.0 • Last updated: March 2, 2026
          </p>
        </div>
      </div>
    </motion.div>
  );
};
