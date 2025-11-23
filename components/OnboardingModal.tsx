
import React, { useState } from 'react';
import { Category } from '../types';
import { Sparkles, Check } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (selected: string[]) => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [selected, setSelected] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleCategory = (cat: string) => {
    if (selected.includes(cat)) {
      setSelected(selected.filter(c => c !== cat));
    } else {
      setSelected([...selected, cat]);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 mb-4">
            <Sparkles size={32} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2 serif">Let's Personalize Your Experience</h2>
          <p className="text-slate-400">Select topics you care about so we can tailor your daily briefing.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {Object.values(Category).map((cat) => {
             const isSelected = selected.includes(cat);
             return (
               <button
                 key={cat}
                 onClick={() => toggleCategory(cat)}
                 className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    isSelected 
                      ? 'border-indigo-500 bg-indigo-500/10 text-white' 
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                 }`}
               >
                 <span className="font-semibold block">{cat}</span>
                 {isSelected && (
                    <div className="absolute top-3 right-3 text-indigo-400">
                        <Check size={18} />
                    </div>
                 )}
               </button>
             );
          })}
        </div>

        <button
          onClick={() => onComplete(selected)}
          disabled={selected.length === 0}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg shadow-indigo-600/20"
        >
          {selected.length === 0 ? 'Select at least one topic' : 'Start My Journey'}
        </button>
      </div>
    </div>
  );
};

export default OnboardingModal;
