import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Check } from 'lucide-react';
import { COLORS } from '../../types';

type UsernameModalProps = {
    isOpen: boolean;
    onSave: (name: string, color: string) => void;
};

export const UsernameModal: React.FC<UsernameModalProps> = ({ isOpen, onSave }) => {
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSave = () => {
        if (!name.trim()) {
            setError('Nama tidak boleh kosong');
            return;
        }
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        onSave(name.trim(), color);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800"
                    >
                        <div className="p-6">
                            <div className="flex justify-center mb-6">
                                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center shadow-inner">
                                    <User size={32} />
                                </div>
                            </div>

                            <div className="text-center mb-6">
                                <h3 className="font-black text-gray-900 dark:text-white text-xl mb-2">Siapa Nama Kamu?</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Masukkan identitas partisipan Anda agar teman di room ini bisa melihat siapa yang sedang ikut berhitung.
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-xl w-full text-xs border border-red-100 mb-4 text-center font-medium">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            if (error) setError(null);
                                        }}
                                        placeholder="Nama Anda (Cth. Budi)"
                                        maxLength={15}
                                        className="w-full bg-gray-50 dark:bg-gray-950 border-2 border-gray-100 dark:border-gray-800 focus:border-indigo-500 dark:focus:border-indigo-600 rounded-xl px-4 py-3 font-bold text-gray-900 dark:text-white outline-none transition-all placeholder:font-medium"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSave}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <Check size={18} />
                                        Mulai Sesi
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
