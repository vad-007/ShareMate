
import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Expense, User, Category, ConfirmationStatus } from '../types';
import { formatCurrency, calculateBalances } from '../utils/calculations';
import { Wallet, TrendingUp, Receipt, RefreshCw, Plus, ArrowRightLeft, Zap, Send, Mic, CheckCircle2, AlertCircle, Flag, Paperclip, X, Filter, ArrowUpDown, Search } from 'lucide-react';
import { Button } from './Button';

interface DashboardProps {
  expenses: Expense[];
  users: User[];
  currentUser: User;
  currency: string;
  onQuickAddTemplate: (expense: Expense) => void;
  onQuickSplit: (description: string, amount: number) => void;
  onOpenQuickAddModal: () => void;
  onToggleConfirmation: (expenseId: string, status: ConfirmationStatus) => void;
  onExpenseClick: (expense: Expense) => void;
}

// Updated colors to match Teal/Emerald theme + Professional accents
const COLORS = ['#14b8a6', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b', '#ec4899'];

export const Dashboard: React.FC<DashboardProps> = ({ 
  expenses, 
  users, 
  currentUser,
  currency, 
  onQuickAddTemplate, 
  onQuickSplit, 
  onOpenQuickAddModal,
  onToggleConfirmation,
  onExpenseClick
}) => {
  const [quickDesc, setQuickDesc] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  
  // Filter/Sort State
  const [sortBy, setSortBy] = useState<'DATE' | 'AMOUNT' | 'CATEGORY' | 'PAYER'>('DATE');
  const [filterPayer, setFilterPayer] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const handleQuickSplitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickDesc && quickAmount) {
      onQuickSplit(quickDesc, parseFloat(quickAmount));
      setQuickDesc('');
      setQuickAmount('');
    }
  };

  // --- Stats Calculations ---
  const billExpenses = expenses.filter(e => e.type !== 'SETTLEMENT');
  const totalSpent = billExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  
  const balances = useMemo(() => calculateBalances(expenses, users), [expenses, users]);
  const maxBalance = Math.max(...Object.values(balances).map((b: number) => Math.abs(b)), 1);

  const categoryData = Object.values(Category)
    .filter(cat => cat !== Category.SETTLEMENT)
    .map(cat => {
      const value = billExpenses
        .filter(e => e.category === cat)
        .reduce((acc, curr) => acc + curr.amount, 0);
      return { name: cat, value };
    }).filter(item => item.value > 0);

  const getConfirmationStats = (expense: Expense) => {
     if (!expense.confirmations) return null;
     const total = expense.involvedUserIds.length;
     const confirmed = Object.values(expense.confirmations).filter(s => s === 'CONFIRMED').length;
     const flagged = Object.values(expense.confirmations).filter(s => s === 'FLAGGED').length;
     return { total, confirmed, flagged, pending: total - confirmed - flagged };
  };

  // --- Filtering & Sorting ---
  const filteredExpenses = expenses
    .filter(e => {
        if (filterPayer !== 'ALL' && e.payerId !== filterPayer) return false;
        if (searchTerm && !e.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    })
    .sort((a, b) => {
        if (sortBy === 'DATE') {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        } else if (sortBy === 'AMOUNT') {
            return b.amount - a.amount;
        } else if (sortBy === 'CATEGORY') {
            return a.category.localeCompare(b.category);
        } else if (sortBy === 'PAYER') {
             const nameA = users.find(u => u.id === a.payerId)?.name || '';
             const nameB = users.find(u => u.id === b.payerId)?.name || '';
             return nameA.localeCompare(nameB);
        }
        return 0;
    });

  return (
    <div className="space-y-6 pb-16">
      
      {/* Net Position Snapshot (Top Card Requirement) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-brand-600" />
                  Net Balances
              </h3>
              <span className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-100 rounded-full">Live Snapshot</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {users.map(user => {
                  const bal = balances[user.id] || 0;
                  const isPositive = bal > 0;
                  const isZero = Math.abs(bal) < 0.01;
                  
                  return (
                      <div key={user.id} className={`rounded-lg p-3 border transition-all ${isZero ? 'border-slate-100 bg-slate-50/50' : isPositive ? 'border-emerald-100 bg-emerald-50/30' : 'border-rose-100 bg-rose-50/30'}`}>
                          <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-slate-700 truncate">{user.name}</span>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${isZero ? 'bg-slate-300' : isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                  {user.name.substring(0,1)}
                              </div>
                          </div>
                          <div className={`text-lg font-bold ${isZero ? 'text-slate-400' : isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isZero ? 'Settled' : formatCurrency(bal, currency)}
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                              {isZero ? '-' : isPositive ? 'Gets Back' : 'Owes'}
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>

      {/* Quick Split Widget - Updated Gradient */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 shadow-lg text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 p-4 opacity-5">
           <Zap className="w-48 h-48 rotate-12" />
        </div>
        
        <div className="relative z-10">
           <h3 className="font-bold text-lg mb-1 flex items-center gap-2 text-brand-300">
             <Zap className="w-5 h-5" />
             Quick Split
           </h3>
           <p className="text-slate-300 text-xs mb-5">Instantly split an expense equally with everyone.</p>
           
           <form onSubmit={handleQuickSplitSubmit} className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                value={quickDesc}
                onChange={(e) => setQuickDesc(e.target.value)}
                placeholder="What did you buy?" 
                className="flex-[2] bg-white/10 border border-white/10 text-white placeholder-slate-400 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
                required
              />
              <div className="flex-1 relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-medium">{currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency}</span>
                <input 
                  type="number" 
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  placeholder="0.00" 
                  min="0"
                  step="0.01"
                  className="w-full bg-white/10 border border-white/10 text-white placeholder-slate-400 rounded-lg pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
                  required
                />
              </div>
              <button 
                type="submit"
                className="bg-brand-500 text-white font-bold px-6 py-2.5 rounded-lg hover:bg-brand-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-900/20"
              >
                <span>Split</span>
                <Send className="w-4 h-4" />
              </button>
           </form>
        </div>
      </div>

      {/* Spending Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <Receipt className="w-5 h-5" />
            </div>
            <p className="text-slate-500 text-sm font-medium">Total Spent</p>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 pl-12">{formatCurrency(totalSpent, currency)}</h3>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-slate-500 text-sm font-medium">Category Breakdown</p>
          </div>
          <div className="h-40 w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value, currency)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend layout="vertical" verticalAlign="middle" align="right" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                 No data available
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Feed with Sorting & Filtering */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
             <h3 className="text-lg font-bold text-slate-800">Recent Activity</h3>
             
             {/* Filters */}
             <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                 <div className="relative flex items-center">
                     <Search className="w-3 h-3 absolute left-3 text-slate-400" />
                     <input 
                        type="text" 
                        placeholder="Search..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 w-28 sm:w-auto transition-all"
                     />
                 </div>

                 <select 
                    value={filterPayer}
                    onChange={(e) => setFilterPayer(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 transition-all"
                 >
                     <option value="ALL">All Payers</option>
                     {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                 </select>

                 <div className="flex items-center bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 hover:border-brand-300 transition-colors cursor-pointer">
                     <ArrowUpDown className="w-3 h-3 text-slate-400 mr-1.5" />
                     <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="text-xs bg-transparent border-none focus:ring-0 p-0 text-slate-700 font-medium cursor-pointer"
                     >
                        <option value="DATE">Date</option>
                        <option value="AMOUNT">Amount</option>
                        <option value="CATEGORY">Category</option>
                        <option value="PAYER">Payer</option>
                     </select>
                 </div>
             </div>
          </div>

          <div className="flex-1 overflow-auto pr-1 max-h-[600px]">
            {filteredExpenses.length === 0 && (
                 <div className="h-32 flex items-center justify-center text-slate-400 italic">
                    No matching activity found.
                 </div>
            )}
            <ul className="space-y-3">
              {filteredExpenses.map((expense) => {
                  const payer = users.find(u => u.id === expense.payerId);
                  const isSettlement = expense.type === 'SETTLEMENT';
                  const stats = getConfirmationStats(expense);
                  
                  // Determine my status
                  const myStatus = expense.confirmations?.[currentUser.id] || 'PENDING';
                  const iAmInvolved = expense.involvedUserIds.includes(currentUser.id);
                  
                  return (
                    <li 
                      key={expense.id} 
                      onClick={() => onExpenseClick(expense)}
                      className={`flex flex-col p-4 rounded-xl transition-all border cursor-pointer group relative overflow-hidden
                        ${isSettlement ? 'bg-slate-50/80 hover:bg-slate-100 border-transparent' : 'bg-white shadow-sm border-slate-100 hover:border-brand-300 hover:shadow-md'}
                      `}
                    >
                        <div className="flex items-center justify-between mb-2 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm transition-transform group-hover:scale-110
                                    ${isSettlement ? 'bg-slate-500' :
                                      expense.category === Category.FOOD ? 'bg-emerald-500' : 
                                      expense.category === Category.UTILITIES ? 'bg-blue-500' :
                                      expense.category === Category.ENTERTAINMENT ? 'bg-violet-500' : 
                                      expense.category === Category.HOME ? 'bg-orange-500' : 'bg-slate-400'
                                    }`}>
                                    {isSettlement ? <ArrowRightLeft className="w-5 h-5" /> : expense.category.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-base font-semibold text-slate-800 truncate group-hover:text-brand-700 transition-colors">
                                            {isSettlement ? `Payment to ${users.find(u => expense.involvedUserIds.includes(u.id))?.name}` : expense.description}
                                        </p>
                                        {expense.isRecurring && <RefreshCw className="w-3 h-3 text-brand-500 shrink-0" />}
                                        {expense.audit?.voiceNoteAttached && <Mic className="w-3 h-3 text-blue-500 shrink-0" />}
                                        {expense.receiptImageUrl && <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                        <span className="font-medium text-slate-700">{payer?.name}</span>
                                        <span>•</span>
                                        <span>{new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                                 <span className={`block text-lg font-bold ${isSettlement ? 'text-slate-500 line-through decoration-2' : 'text-slate-800'}`}>
                                    {formatCurrency(expense.amount, currency)}
                                 </span>
                            </div>
                        </div>
                        
                        {/* Audit / Confirmation Bar */}
                        {!isSettlement && stats && (
                            <div className="flex items-center justify-between mt-1 pl-[4rem] border-t border-slate-50 pt-3">
                                <div className="flex items-center gap-3">
                                    {stats.flagged > 0 && (
                                        <span className="flex items-center gap-1 text-[10px] text-rose-600 font-medium bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                                            <Flag className="w-3 h-3" /> {stats.flagged}
                                        </span>
                                    )}
                                    {/* Progress bar */}
                                    <div className="flex items-center gap-2">
                                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-emerald-500 transition-all duration-500" 
                                                style={{ width: `${(stats.confirmed / stats.total) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            {stats.confirmed}/{stats.total}
                                        </span>
                                    </div>
                                </div>

                                {/* My Actions */}
                                {iAmInvolved && (
                                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                        {myStatus === 'PENDING' && (
                                            <>
                                                <button 
                                                    onClick={() => onToggleConfirmation(expense.id, 'CONFIRMED')}
                                                    className="text-[10px] bg-white text-emerald-700 px-2 py-1 rounded border border-emerald-200 hover:bg-emerald-50 flex items-center gap-1 transition-colors shadow-sm"
                                                >
                                                    <CheckCircle2 className="w-3 h-3" /> Confirm
                                                </button>
                                                <button 
                                                     onClick={() => onToggleConfirmation(expense.id, 'FLAGGED')}
                                                    className="text-[10px] bg-white text-rose-600 px-2 py-1 rounded border border-rose-200 hover:bg-rose-50 flex items-center gap-1 transition-colors shadow-sm"
                                                >
                                                    <AlertCircle className="w-3 h-3" /> Flag
                                                </button>
                                            </>
                                        )}
                                        {myStatus === 'CONFIRMED' && (
                                             <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                <CheckCircle2 className="w-3 h-3" /> Confirmed
                                             </span>
                                        )}
                                        {myStatus === 'FLAGGED' && (
                                             <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                                                <Flag className="w-3 h-3" /> Flagged
                                             </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </li>
                  );
              })}
            </ul>
          </div>
      </div>

      {/* Floating Action Button for Quick Add - Updated Colors */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <button
            onClick={onOpenQuickAddModal}
            className="bg-slate-900 text-white p-4 rounded-full shadow-xl hover:bg-slate-800 active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-slate-300 border border-slate-700"
            aria-label="Quick Add Expense"
        >
            <Zap className="w-6 h-6 text-brand-300 fill-brand-300" />
        </button>
      </div>
      
      {/* Desktop FAB equivalent */}
      <div className="hidden md:block fixed bottom-8 right-8 z-40">
         <Button onClick={onOpenQuickAddModal} size="lg" className="rounded-full shadow-xl pl-5 pr-6 py-4 h-auto bg-slate-900 hover:bg-slate-800 text-white border border-slate-700" icon={<Zap className="w-5 h-5 text-brand-300 fill-brand-300" />}>
            Quick Add
         </Button>
      </div>

    </div>
  );
};
