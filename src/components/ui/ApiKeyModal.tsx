import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, ExternalLink, X, AlertCircle, ShieldAlert } from 'lucide-react';
import { getApiKey, setApiKey, removeApiKey } from '../../utils';

type ApiKeyModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onKeySaved: (key: string) => void;
};

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onKeySaved }) => {
    const [inputKey, setInputKey] = useState(getApiKey() || '');
    const [error, setError] = useState<string | null>(null);

    const handleSave = () => {
        const trimmedKey = inputKey.trim();
        if (!trimmedKey) {
            setError('API key tidak boleh kosong.');
            return;
        }
        if (!trimmedKey.startsWith('AIza')) {
            setError('Format API key tidak valid. Key harus dimulai dengan "AIza".');
            return;
        }
        setApiKey(trimmedKey);
        setError(null);
        onKeySaved(trimmedKey);
    };

    const handleRemove = () => {
        removeApiKey();
        setInputKey('');
        setError(null);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
                                    <Key size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 dark:text-white text-base">API Key</h3>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-widest">Gemini AI</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Security warning banner */}
                        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                            <ShieldAlert size={15} className="text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-amber-700 dark:text-amber-400 text-xs leading-relaxed">
                                Key disimpan hanya di browser ini. Jangan gunakan key billing aktif di perangkat bersama.
                            </p>
                        </div>

                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Masukkan Gemini API key kamu untuk mengaktifkan fitur scan struk otomatis.
                        </p>

                        <div className="space-y-2">
                            <input
                                type="password"
                                value={inputKey}
                                onChange={(e) => {
                                    setInputKey(e.target.value);
                                    setError(null);
                                }}
                                placeholder="AIza..."
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
                            />
                            {error && (
                                <div className="flex items-center gap-2 text-red-500 text-xs">
                                    <AlertCircle size={14} />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>

                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 text-xs font-medium hover:underline"
                        >
                            <ExternalLink size={12} />
                            Dapatkan API key gratis di Google AI Studio
                        </a>

                        <div className="flex gap-2 pt-2">
                            {getApiKey() && (
                                <button
                                    onClick={handleRemove}
                                    className="flex-1 py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-red-500 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                    Hapus Key
                                </button>
                            )}
                            <button
                                onClick={handleSave}
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors"
                            >
                                Simpan
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
