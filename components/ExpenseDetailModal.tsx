
import React from 'react';
import { X, Calendar, User, Tag, Receipt, Trash2, Edit2, Mic, CheckCircle2, AlertCircle } from 'lucide-react';
import { Expense, User as UserType, Category, ConfirmationStatus } from '../types';
import { formatCurrency } from '../utils/calculations';
import { Button } from './Button';

interface ExpenseDetailModalProps {
  expense: Expense;
  users: UserType[];
  currency: string;
  currentUser: UserType;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  expense,
  users,
  currency,
  currentUser,
  onClose,
  onEdit,
  onDelete
}) => {
  const payer = users.find(u => u.id === expense.payerId);
  const createdBy = users.find(u => u.id === expense.audit?.createdBy);
  
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${expense.description}"? This cannot be undone.`)) {
      onDelete(expense.id);
      onClose();
    }
  };

  const getSplitAmount = (userId: string) => {
    if (expense.splitType === 'CUSTOM' && expense.splitDetails) {
      return expense.splitDetails[userId] || 0;
    }
    // Equal split logic fallback
    const count = expense.involvedUserIds.length;
    return count > 0 ? expense.amount / count : 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg shadow-sm
                ${expense.category === Category.FOOD ? 'bg-green-500' : 
                  expense.category === Category.UTILITIES ? 'bg-blue-500' :
                  expense.category === Category.ENTERTAINMENT ? 'bg-purple-500' : 
                  expense.category === Category.HOME ? 'bg-orange-500' : 
                  expense.type === 'SETTLEMENT' ? 'bg-slate-600' : 'bg-slate-400'
                }`}>
                {expense.type === 'SETTLEMENT' ? '₹' : expense.category.substring(0, 1).toUpperCase()}
             </div>
             <div>
               <h2 className="text-lg font-bold text-slate-800 leading-tight">{expense.description}</h2>
               <p className="text-xs text-slate-500 font-medium">{expense.type === 'SETTLEMENT' ? 'Payment' : expense.category}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Amount & Main Info */}
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
             <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(expense.amount, currency)}</p>
             </div>
             <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-1 justify-end">
                   <Calendar className="w-4 h-4" />
                   <span>{expense.date}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 justify-end">
                   <User className="w-4 h-4" />
                   <span>Paid by <span className="font-bold text-slate-800">{payer?.name || 'Unknown'}</span></span>
                </div>
             </div>
          </div>

          {/* Receipt Image */}
          {expense.receiptImageUrl && (
            <div>
               <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                 <Receipt className="w-4 h-4 text-brand-500" /> Receipt
               </h3>
               <div className="bg-slate-100 rounded-lg p-2 border border-slate-200">
                  <img src={expense.receiptImageUrl} alt="Receipt" className="w-full max-h-60 object-contain rounded" />
               </div>
            </div>
          )}

          {/* Split Breakdown */}
          {expense.type !== 'SETTLEMENT' && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-brand-500" /> Split Breakdown
              </h3>
              <div className="space-y-2">
                {expense.involvedUserIds.map(userId => {
                  const user = users.find(u => u.id === userId);
                  const amount = getSplitAmount(userId);
                  const status = expense.confirmations?.[userId] || 'PENDING';
                  
                  return (
                    <div key={userId} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs">
                          {user?.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                           <p className="text-sm font-medium text-slate-800">{user?.name}</p>
                           {status !== 'PENDING' && (
                               <p className={`text-[10px] font-bold flex items-center gap-1 ${status === 'CONFIRMED' ? 'text-green-600' : 'text-red-500'}`}>
                                   {status === 'CONFIRMED' ? <CheckCircle2 className="w-3 h-3"/> : <AlertCircle className="w-3 h-3"/>}
                                   {status}
                               </p>
                           )}
                        </div>
                      </div>
                      <span className="font-bold text-slate-700">{formatCurrency(amount, currency)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Audit Info */}
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 space-y-1">
             <p>Added by {createdBy?.name || 'Unknown'} on {new Date(expense.audit?.createdAt || '').toLocaleString()}</p>
             {expense.audit?.voiceNoteAttached && (
               <p className="flex items-center gap-1 text-blue-400"><Mic className="w-3 h-3" /> Voice Note Attached</p>
             )}
             <p>ID: {expense.id}</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
           <button 
             onClick={handleDelete}
             className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors"
           >
              <Trash2 className="w-4 h-4" /> Delete
           </button>
           <Button 
             onClick={() => { onClose(); onEdit(expense); }} 
             className="flex-[2] flex items-center justify-center gap-2"
             icon={<Edit2 className="w-4 h-4" />}
           >
              Edit Expense
           </Button>
        </div>

      </div>
    </div>
  );
};
