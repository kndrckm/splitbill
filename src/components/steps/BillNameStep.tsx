import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Plus, X, GripVertical } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { ReceiptData, Person } from '../../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type SortablePersonItemProps = {
  person: Person;
  removePerson: (id: string) => void;
};

const SortablePersonItem: React.FC<SortablePersonItemProps> = ({ person, removePerson }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: person.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
    >
      <div className="flex items-center space-x-3">
        <div {...attributes} {...listeners} className="p-1 text-gray-300 dark:text-gray-600 hover:text-indigo-500 transition-colors">
          <GripVertical size={16} />
        </div>
        <div className={`w-8 h-8 rounded-full ${person.color} flex items-center justify-center text-white font-bold shadow-inner text-sm`}>
          {person.name.charAt(0).toUpperCase()}
        </div>
        <span className="font-bold text-gray-900 dark:text-white text-base">{person.name}</span>
      </div>
      <button 
        onClick={() => removePerson(person.id)}
        className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
};

type BillNameStepProps = {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  currentBill: ReceiptData | undefined;
  setBills: (bills: ReceiptData[]) => void;
  bills: ReceiptData[];
  setStep: (step: any) => void;
  people: Person[];
  setPeople: (people: Person[]) => void;
  newPersonName: string;
  setNewPersonName: (val: string) => void;
  addPerson: (e: React.FormEvent) => void;
  removePerson: (id: string) => void;
  onBack: () => void;
};

export const BillNameStep: React.FC<BillNameStepProps> = ({ 
  darkMode, setDarkMode, currentBill, setBills, bills, setStep, people, setPeople, newPersonName, setNewPersonName, addPerson, removePerson, onBack
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = people.findIndex((p) => p.id === active.id);
      const newIndex = people.findIndex((p) => p.id === over.id);
      setPeople(arrayMove(people, oldIndex, newIndex));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full dark:bg-gray-950"
    >
      <div className="p-4 flex justify-between items-center bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h2 className="font-black text-gray-900 dark:text-white text-base tracking-tight">Detail Nota</h2>
          <p className="text-[8px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-widest">Nama & Orang</p>
        </div>
        <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Nama Nota</h3>
            <input 
              type="text" 
              value={currentBill?.name || ''}
              onChange={(e) => {
                if (currentBill) {
                  setBills(bills.map(b => b.id === currentBill.id ? { ...b, name: e.target.value } : b));
                }
              }}
              className="w-full bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 focus:border-indigo-500 dark:focus:border-indigo-600 py-3 px-4 rounded-xl text-base font-bold text-gray-900 dark:text-white focus:outline-none transition-all shadow-sm"
              placeholder="Contoh: Makan Siang Kantor"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Tambahkan orang...</h3>
              <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">{people.length} Orang</span>
            </div>
            <form onSubmit={addPerson} className="relative">
              <input 
                type="text" 
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                placeholder="Masukkan nama..."
                className="w-full bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 focus:border-indigo-500 dark:focus:border-indigo-600 py-3 px-4 rounded-xl text-base font-bold text-gray-900 dark:text-white focus:outline-none transition-all pr-14 shadow-sm"
              />
              <button 
                type="submit"
                className="absolute right-2 top-2 bottom-2 bg-indigo-600 text-white w-10 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none active:scale-90 transition-transform"
              >
                <Plus size={20} />
              </button>
            </form>

            <div className="space-y-2">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={people.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <AnimatePresence mode="popLayout">
                    {people.map((person) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key={person.id}
                      >
                        <SortablePersonItem 
                          person={person} 
                          removePerson={removePerson} 
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-900 shadow-xl">
        <button
          onClick={() => setStep('ASSIGN_ITEMS')}
          disabled={!currentBill?.name || people.length === 0}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          <span>Lanjut Bagi Item</span>
          <ChevronRight size={20} />
        </button>
      </div>
    </motion.div>
  );
};
