
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Plus, X, Loader2, Check, RefreshCw, Divide, Hash, Scale, Save } from 'lucide-react';
import { Category, User, SplitType, Expense } from '../types';
import { Button } from './Button';
import { geminiService } from '../services/geminiService';

interface ExpenseFormProps {
  users: User[];
  currentUser?: User;
  initialData?: Expense; // Optional data for editing
  onSubmit: (data: any) => void; // Generic submit handler
  onCancel: () => void;
}

type FormSplitType = SplitType | 'SHARES';

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ users, currentUser, initialData, onSubmit, onCancel }) => {
  // Filter for Active Users Only (unless editing an expense involving inactive users, ideally handled by keeping IDs)
  const activeUsers = users.filter(u => u.isActive !== false);
  
  // --- State Initialization ---
  const [description, setDescription] = useState(initialData?.description || '');
  const [amount, setAmount] = useState(initialData?.amount.toString() || '');
  const [payerId, setPayerId] = useState(initialData?.payerId || currentUser?.id || activeUsers[0]?.id || '');
  const [category, setCategory] = useState<Category>(initialData?.category || Category.FOOD);
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.receiptImageUrl || null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Split State
  const [involvedUserIds, setInvolvedUserIds] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<FormSplitType>('EQUAL');
  const [customAmounts, setCustomAmounts] = useState<{ [userId: string]: string }>({});
  const [userShares, setUserShares] = useState<{ [userId: string]: number }>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLInputElement>(null);

  // --- Effect: Initialize Splits based on Initial Data or Defaults ---
  useEffect(() => {
    if (initialData) {
        // Edit Mode Initialization
        setInvolvedUserIds(initialData.involvedUserIds);
        
        if (initialData.splitType === 'CUSTOM' && initialData.splitDetails) {
            setSplitMode('CUSTOM');
            const stringAmounts: {[key: string]: string} = {};
            Object.entries(initialData.splitDetails).forEach(([uid, amt]) => {
                stringAmounts[uid] = amt.toString();
            });
            setCustomAmounts(stringAmounts);
        } else {
            setSplitMode('EQUAL');
        }
    } else {
        // Add Mode Initialization
        // Default to all active users involved
        const allIds = activeUsers.map(u => u.id);
        setInvolvedUserIds(allIds);
        
        const initialShares: {[key: string]: number} = {};
        allIds.forEach(id => initialShares[id] = 1);
        setUserShares(initialShares);
    }
    
    // Focus description only on Add mode
    if (!initialData && descInputRef.current) {
        descInputRef.current.focus();
    }
  }, [initialData]); // Run once when component mounts or initialData changes

  // Initialize custom amounts when switching to custom split (if not already set)
  useEffect(() => {
    if (splitMode === 'CUSTOM' && amount && Object.keys(customAmounts).length === 0) {
      const total = parseFloat(amount);
      if (!isNaN(total)) {
        const count = involvedUserIds.length;
        const split = (total / count).toFixed(2);
        const initialSplits: { [id: string]: string } = {};
        involvedUserIds.forEach(id => {
            initialSplits[id] = split;
        });
        setCustomAmounts(initialSplits);
      }
    }
  }, [splitMode, amount, involvedUserIds]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const result = reader.result;
      if (typeof result !== 'string') return;
      
      const base64String = result;
      setPreviewUrl(base64String);
      setIsProcessing(true);
      try {
        const base64Data = base64String.split(',')[1];
        if (!base64Data) throw new Error("Invalid image data");
        
        const data = await geminiService.parseReceiptImage(base64Data);
        
        setDescription(data.merchant || '');
        setAmount(data.total?.toString() || '');
        if (data.date) setDate(data.date);
        
        const catMatch = Object.values(Category).find(
          c => c.toLowerCase() === (data.category || '').toLowerCase()
        );
        if (catMatch) setCategory(catMatch);
        
      } catch (err: any) {
        console.error("Failed to parse receipt", err);
        alert("Could not extract data. Please enter manually.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleUserInvolvement = (userId: string) => {
    setInvolvedUserIds(prev => {
      let newIds;
      if (prev.includes(userId)) {
        if (prev.length === 1) return prev; // Don't remove last one
        newIds = prev.filter(id => id !== userId);
      } else {
        newIds = [...prev, userId];
      }
      return newIds;
    });
  };

  const handleCustomAmountChange = (userId: string, val: string) => {
      setCustomAmounts(prev => ({ ...prev, [userId]: val }));
  };

  const handleShareChange = (userId: string, change: number) => {
      setUserShares(prev => ({
          ...prev,
          [userId]: Math.max(0, (prev[userId] || 0) + change)
      }));
  };

  const getCustomTotal = () => {
      return Object.entries(customAmounts)
        .filter(([id]) => involvedUserIds.includes(id))
        .reduce((sum, [_, val]) => sum + (parseFloat(val as string) || 0), 0);
  };

  const getTotalShares = () => {
      return involvedUserIds.reduce((sum, id) => sum + (userShares[id] || 0), 0);
  };

  const getShareAmount = (userId: string) => {
      const totalAmount = parseFloat(amount) || 0;
      const totalShares = getTotalShares();
      if (totalShares === 0) return 0;
      return (totalAmount * ((userShares[userId] || 0) / totalShares));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !payerId || involvedUserIds.length === 0) return;

    const numAmount = parseFloat(amount);
    let finalSplitDetails: { [key: string]: number } | undefined = undefined;
    let finalSplitType: SplitType = 'EQUAL';

    if (splitMode === 'CUSTOM') {
        const currentTotal = getCustomTotal();
        if (Math.abs(currentTotal - numAmount) > 0.05) {
            alert(`Custom splits total (${currentTotal.toFixed(2)}) must match expense amount (${numAmount.toFixed(2)})`);
            return;
        }
        finalSplitDetails = {};
        involvedUserIds.forEach(id => {
            finalSplitDetails![id] = parseFloat(customAmounts[id]) || 0;
        });
        finalSplitType = 'CUSTOM';
    } else if (splitMode === 'SHARES') {
        const totalShares = getTotalShares();
        if (totalShares === 0) {
            alert("Total shares cannot be zero.");
            return;
        }
        finalSplitDetails = {};
        involvedUserIds.forEach(id => {
             // Calculate exact share
             finalSplitDetails![id] = (numAmount * ((userShares[id] || 0) / totalShares));
        });
        finalSplitType = 'CUSTOM'; // We save as custom amounts for precision
    }

    const formData = {
      description,
      amount: numAmount,
      payerId,
      category,
      date,
      involvedUserIds,
      isRecurring,
      items: [],
      type: 'BILL',
      splitType: finalSplitType,
      splitDetails: finalSplitDetails,
      receiptImageUrl: previewUrl
    };

    onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden max-w-lg w-full mx-auto my-4" role="dialog" aria-labelledby="add-expense-title">
      <div className="bg-brand-600 px-6 py-4 flex justify-between items-center">
        <h2 id="add-expense-title" className="text-white text-lg font-semibold">
            {initialData ? 'Edit Expense' : 'Add New Expense'}
        </h2>
        <button onClick={onCancel} className="text-brand-100 hover:text-white" aria-label="Close">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="p-6 max-h-[80vh] overflow-y-auto">
        {/* Receipt Scan */}
        <div className="mb-6">
            <div 
                className={`relative border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center transition-colors h-24 ${previewUrl ? 'border-brand-400 bg-brand-50' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'}`}
            >
                {previewUrl ? (
                    <div className="relative w-full h-full">
                        <img src={previewUrl} alt="Receipt" className="w-full h-full object-contain rounded" />
                        <button 
                            onClick={() => { setPreviewUrl(null); if(fileInputRef.current) fileInputRef.current.value=''; }}
                            className="absolute top-0 right-0 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                            aria-label="Remove image"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-full flex flex-col items-center justify-center focus:outline-none"
                    >
                        <div className="flex items-center gap-2 text-brand-600 font-medium">
                            <Camera className="w-5 h-5" />
                            <span>Scan Receipt</span>
                        </div>
                    </button>
                )}
                <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileChange}
                    aria-label="Upload receipt image"
                />
                {isProcessing && (
                    <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                        <Loader2 className="w-6 h-6 text-brand-600 animate-spin mb-1" />
                        <p className="text-xs font-medium text-brand-800">Scanning...</p>
                    </div>
                )}
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="desc" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Description</label>
            <input
              id="desc"
              ref={descInputRef}
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border-slate-300 border px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              placeholder="e.g. Weekly Grocery Run"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Amount</label>
              <div className="relative">
                <input
                  id="amount"
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border px-3 py-2 pl-7 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  placeholder="0.00"
                />
                <span className="absolute left-3 top-2 text-slate-400 text-sm">₹</span>
              </div>
            </div>
            <div>
              <label htmlFor="date" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Date</label>
              <input
                id="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border-slate-300 border px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Category</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full rounded-lg border-slate-300 border px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
              >
                {Object.values(Category).filter(c => c !== Category.SETTLEMENT).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="payer" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Paid By</label>
              <select
                id="payer"
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full rounded-lg border-slate-300 border px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.id === currentUser?.id ? 'You' : user.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Split Section */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
             <div className="flex justify-between items-center mb-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Split Method</label>
                <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setSplitMode('EQUAL')}
                        className={`flex-1 px-3 py-1 text-[10px] sm:text-xs font-medium rounded-md transition-colors ${splitMode === 'EQUAL' ? 'bg-brand-100 text-brand-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Equally
                    </button>
                    <button
                        type="button"
                        onClick={() => setSplitMode('SHARES')}
                        className={`flex-1 px-3 py-1 text-[10px] sm:text-xs font-medium rounded-md transition-colors ${splitMode === 'SHARES' ? 'bg-brand-100 text-brand-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        By Shares
                    </button>
                    <button
                        type="button"
                        onClick={() => setSplitMode('CUSTOM')}
                        className={`flex-1 px-3 py-1 text-[10px] sm:text-xs font-medium rounded-md transition-colors ${splitMode === 'CUSTOM' ? 'bg-brand-100 text-brand-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Unequally
                    </button>
                </div>
             </div>

             {splitMode === 'EQUAL' && (
                <div className="flex flex-wrap gap-2">
                    {activeUsers.map(user => {
                        const isSelected = involvedUserIds.includes(user.id);
                        return (
                            <button
                                key={user.id}
                                type="button"
                                onClick={() => toggleUserInvolvement(user.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                    isSelected 
                                        ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium' 
                                        : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300'
                                }`}
                            >
                                {user.name}
                                {isSelected && <Check className="w-3 h-3" />}
                            </button>
                        );
                    })}
                </div>
             )}

             {splitMode === 'SHARES' && (
                <div className="space-y-2">
                   {activeUsers.map(user => {
                      const isSelected = involvedUserIds.includes(user.id);
                      const shareCount = userShares[user.id] || 0;
                      return (
                         <div key={user.id} className={`flex items-center gap-3 ${!isSelected ? 'opacity-50' : ''}`}>
                             <div className="flex-1 flex items-center gap-2">
                                <input 
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleUserInvolvement(user.id)}
                                    className="rounded text-brand-600 focus:ring-brand-500 border-gray-300"
                                />
                                <span className="text-sm text-slate-700">{user.name}</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <div className="flex items-center border rounded-md overflow-hidden bg-white">
                                   <button 
                                     type="button" 
                                     disabled={!isSelected || shareCount <= 0}
                                     onClick={() => handleShareChange(user.id, -1)}
                                     className="px-2 py-1 hover:bg-slate-100 disabled:opacity-50"
                                   >-</button>
                                   <span className="w-8 text-center text-sm font-medium">{shareCount}</span>
                                   <button 
                                     type="button" 
                                     disabled={!isSelected}
                                     onClick={() => handleShareChange(user.id, 1)}
                                     className="px-2 py-1 hover:bg-slate-100 disabled:opacity-50"
                                   >+</button>
                                </div>
                                <span className="w-16 text-right text-xs text-slate-500">
                                   {parseFloat(amount || '0') > 0 ? (getShareAmount(user.id)).toFixed(2) : '0.00'}
                                </span>
                             </div>
                         </div>
                      )
                   })}
                   <div className="text-right text-xs text-brand-600 pt-2">
                      Total Shares: {getTotalShares()}
                   </div>
                </div>
             )}

             {splitMode === 'CUSTOM' && (
                <div className="space-y-2">
                    {activeUsers.map(user => {
                         const isSelected = involvedUserIds.includes(user.id);
                         return (
                             <div key={user.id} className={`flex items-center gap-3 ${!isSelected ? 'opacity-50' : ''}`}>
                                 <div className="flex-1 flex items-center gap-2">
                                    <input 
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleUserInvolvement(user.id)}
                                        className="rounded text-brand-600 focus:ring-brand-500 border-gray-300"
                                    />
                                    <span className="text-sm text-slate-700">{user.name}</span>
                                 </div>
                                 <div className="w-32">
                                    <input 
                                        type="number"
                                        value={customAmounts[user.id] || ''}
                                        onChange={(e) => handleCustomAmountChange(user.id, e.target.value)}
                                        disabled={!isSelected}
                                        className="w-full text-right text-sm rounded border-slate-300 border px-2 py-1 focus:ring-1 focus:ring-brand-500 outline-none"
                                        placeholder="0.00"
                                    />
                                 </div>
                             </div>
                         )
                    })}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
                        <span className="text-xs font-medium text-slate-500">Total Split</span>
                        <span className={`text-sm font-bold ${Math.abs(getCustomTotal() - (parseFloat(amount)||0)) > 0.05 ? 'text-red-500' : 'text-green-600'}`}>
                            {getCustomTotal().toFixed(2)} / {parseFloat(amount || '0').toFixed(2)}
                        </span>
                    </div>
                </div>
             )}
          </div>

          {/* Recurring Toggle */}
          <div className="flex items-center gap-3 pt-2">
             <button
                type="button"
                onClick={() => setIsRecurring(!isRecurring)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${isRecurring ? 'bg-brand-600' : 'bg-slate-200'}`}
             >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isRecurring ? 'translate-x-5' : 'translate-x-0'}`} />
             </button>
             <div className="flex flex-col">
                 <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                    Recurring Monthly
                 </span>
                 <span className="text-xs text-slate-400">App will remind you to add this next month</span>
             </div>
          </div>

          <div className="pt-4 flex gap-3">
             <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" icon={initialData ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}>
              {initialData ? 'Save Changes' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
