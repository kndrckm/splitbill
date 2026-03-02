import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, ExternalLink, X, AlertCircle } from 'lucide-react';
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

                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            Untuk menggunakan fitur scan nota, Anda memerlukan API key Gemini. Key disimpan hanya di browser Anda dan tidak dikirim ke server mana pun.
                        </p>

                        <a
                            href="https://aistudio.google.com/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                        >
                            <ExternalLink size={12} />
                            <span>Dapatkan API Key di Google AI Studio</span>
                        </a>

                        {error && (
                            <div className="flex items-center space-x-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs">
                                <AlertCircle size={14} />
                                <span>{error}</span>
                            </div>
                        )}

                        <input
                            type="password"
                            value={inputKey}
                            onChange={(e) => { setInputKey(e.target.value); setError(null); }}
                            placeholder="AIzaSy..."
                            className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 focus:border-indigo-500 dark:focus:border-indigo-600 py-3 px-4 rounded-xl text-sm font-mono text-gray-900 dark:text-white focus:outline-none transition-all"
                        />

                        <div className="flex space-x-2">
                            <button
                                onClick={handleSave}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-95 text-sm shadow-lg shadow-indigo-200 dark:shadow-none"
                            >
                                Simpan & Lanjut
                            </button>
                            {getApiKey() && (
                                <button
                                    onClick={handleRemove}
                                    className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold py-3 px-4 rounded-xl transition-all active:scale-95 text-sm"
                                >
                                    Hapus
                                </button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
