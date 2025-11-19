
import React, { useState } from 'react';
import { X, Mic, Check, Bell, User as UserIcon } from 'lucide-react';
import { User, Category, Expense } from '../types';
import { Button } from './Button';

interface QuickAddModalProps {
  users: User[];
  currentUser: User;
  onSave: (data: Partial<Expense>, notify: boolean) => void;
  onClose: () => void;
  currency: string;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ users, currentUser, onSave, onClose, currency }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [payerId, setPayerId] = useState(currentUser.id);
  const [selectedCategory, setSelectedCategory] = useState<Category>(Category.FOOD);
  const [involvedUserIds, setInvolvedUserIds] = useState<string[]>(users.map(u => u.id)); // Default all
  const [notifyGroup, setNotifyGroup] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNoteAttached, setVoiceNoteAttached] = useState(false);

  const categories = [
    { type: Category.FOOD, icon: '🍔' },
    { type: Category.TRANSPORT, icon: '🚕' },
    { type: Category.UTILITIES, icon: '💡' },
    { type: Category.HOME, icon: '🏠' },
    { type: Category.ENTERTAINMENT, icon: '🎬' },
    { type: Category.OTHER, icon: '📝' },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    onSave({
      amount: parseFloat(amount),
      description,
      payerId,
      category: selectedCategory,
      involvedUserIds,
      date: new Date().toISOString().split('T')[0],
      audit: {
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
        voiceNoteAttached
      }
    }, notifyGroup);
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setVoiceNoteAttached(true);
    } else {
      setIsRecording(true);
      // Simulate 2s recording
      setTimeout(() => {
        setIsRecording(false);
        setVoiceNoteAttached(true);
      }, 2000);
    }
  };

  const toggleUser = (userId: string) => {
    setInvolvedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Quick Add</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Amount Input (Keypad Style) */}
          <div className="flex flex-col items-center justify-center">
             <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Amount</label>
             <div className="relative flex items-center justify-center w-full">
                <span className="text-4xl font-bold text-slate-300 mr-2">{currency === 'INR' ? '₹' : currency}</span>
                <input
                  type="number"
                  autoFocus
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-6xl font-bold text-slate-800 w-full text-center focus:outline-none placeholder-slate-200 bg-transparent"
                  step="0.01"
                  required
                />
             </div>
          </div>

          {/* Description */}
          <input
            type="text"
            placeholder="What is this for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-lg text-center font-medium border-b-2 border-slate-100 focus:border-brand-500 py-2 focus:outline-none transition-colors"
            required
          />

          {/* Category Grid */}
          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">Category</label>
             <div className="flex justify-center gap-4 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat.type}
                    type="button"
                    onClick={() => setSelectedCategory(cat.type)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${selectedCategory === cat.type ? 'bg-brand-100 ring-2 ring-brand-500 transform scale-110' : 'bg-slate-50 hover:bg-slate-100'}`}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-[10px] font-medium text-slate-600">{cat.type}</span>
                  </button>
                ))}
             </div>
          </div>

          {/* Details Row */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-4">
             {/* Payer */}
             <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Paid by</span>
                <select
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                  className="bg-white border border-slate-200 text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.id === currentUser.id ? 'Me' : u.name}</option>
                  ))}
                </select>
             </div>

             {/* Split With (Chips) */}
             <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Split with</span>
                  <span className="text-xs text-brand-600 font-medium cursor-pointer" onClick={() => setInvolvedUserIds(users.map(u => u.id))}>Select All</span>
                </div>
                <div className="flex flex-wrap gap-2">
                   {users.map(u => (
                     <button
                       key={u.id}
                       type="button"
                       onClick={() => toggleUser(u.id)}
                       className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${involvedUserIds.includes(u.id) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-200'}`}
                     >
                       {u.name}
                     </button>
                   ))}
                </div>
             </div>
          </div>

          {/* Actions Row */}
          <div className="flex items-center justify-between pt-2">
             {/* Voice Note */}
             <button
               type="button"
               onClick={toggleRecording}
               className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : voiceNoteAttached ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}
             >
                <Mic className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {isRecording ? 'Recording...' : voiceNoteAttached ? 'Voice Added' : 'Voice Note'}
                </span>
                {voiceNoteAttached && <button onClick={(e) => { e.stopPropagation(); setVoiceNoteAttached(false); }} className="ml-1 hover:text-red-500"><X className="w-3 h-3"/></button>}
             </button>

             {/* Notify Toggle */}
             <div 
               className="flex items-center gap-2 cursor-pointer"
               onClick={() => setNotifyGroup(!notifyGroup)}
             >
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${notifyGroup ? 'bg-brand-600 border-brand-600' : 'border-slate-300 bg-white'}`}>
                   {notifyGroup && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm text-slate-600 flex items-center gap-1">
                   Notify Group <Bell className="w-3 h-3" />
                </span>
             </div>
          </div>

          <Button type="submit" className="w-full py-3 text-lg shadow-lg shadow-brand-200">
             Save Expense
          </Button>
        </form>
      </div>
    </div>
  );
};
