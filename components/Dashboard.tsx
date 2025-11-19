import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Expense, User, Category } from '../types';
import { formatCurrency } from '../utils/calculations';
import { Wallet, TrendingUp, Receipt, RefreshCw, Plus, ArrowRightLeft, Zap, Send } from 'lucide-react';
import { Button } from './Button';

interface DashboardProps {
  expenses: Expense[];
  users: User[];
  currency: string;
  onQuickAdd: (expense: Expense) => void;
  onQuickSplit: (description: string, amount: number) => void;
}

const COLORS = ['#22c55e', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b', '#ec4899'];

export const Dashboard: React.FC<DashboardProps> = ({ expenses, users, currency, onQuickAdd, onQuickSplit }) => {
  const [quickDesc, setQuickDesc] = useState('');
  const [quickAmount, setQuickAmount] = useState('');

  const handleQuickSplitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickDesc && quickAmount) {
      onQuickSplit(quickDesc, parseFloat(quickAmount));
      setQuickDesc('');
      setQuickAmount('');
    }
  };

  // Filter out settlements for spending stats
  const billExpenses = expenses.filter(e => e.type !== 'SETTLEMENT');
  
  const totalSpent = billExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  
  const categoryData = Object.values(Category)
    .filter(cat => cat !== Category.SETTLEMENT)
    .map(cat => {
      const value = billExpenses
        .filter(e => e.category === cat)
        .reduce((acc, curr) => acc + curr.amount, 0);
      return { name: cat, value };
    }).filter(item => item.value > 0);

  const userSpending = users.map(user => {
    const spent = billExpenses
      .filter(e => e.payerId === user.id)
      .reduce((acc, curr) => acc + curr.amount, 0);
    return { name: user.name, value: spent };
  }).sort((a, b) => b.value - a.value);

  // Get unique recurring expenses
  const recurringTemplates = expenses
    .filter(e => e.isRecurring && e.type !== 'SETTLEMENT')
    .reduce((acc, current) => {
        const x = acc.find(item => item.description === current.description && item.amount === current.amount);
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
    }, [] as Expense[]);

  return (
    <div className="space-y-6">
      {/* Quick Split Widget */}
      <div className="bg-gradient-to-r from-brand-700 to-brand-600 rounded-xl p-5 shadow-lg text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
           <Zap className="w-24 h-24" />
        </div>
        
        <div className="relative z-10">
           <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
             <Zap className="w-5 h-5 fill-yellow-300 text-yellow-300" />
             Quick Split
           </h3>
           <p className="text-brand-100 text-xs mb-4">Instantly split an expense equally with everyone.</p>
           
           <form onSubmit={handleQuickSplitSubmit} className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                value={quickDesc}
                onChange={(e) => setQuickDesc(e.target.value)}
                placeholder="What did you buy?" 
                className="flex-[2] bg-white/10 border border-white/20 text-white placeholder-brand-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white/50"
                required
              />
              <div className="flex-1 relative">
                <span className="absolute left-3 top-2.5 text-brand-200 text-sm font-medium">{currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency}</span>
                <input 
                  type="number" 
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  placeholder="0.00" 
                  min="0"
                  step="0.01"
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-brand-200 rounded-lg pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white/50"
                  required
                />
              </div>
              <button 
                type="submit"
                className="bg-white text-brand-700 font-bold px-6 py-2.5 rounded-lg hover:bg-brand-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Split</span>
                <Send className="w-4 h-4" />
              </button>
           </form>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-green-100 rounded-lg text-green-600">
              <Wallet className="w-5 h-5" />
            </div>
            <p className="text-slate-500 text-sm font-medium">Total Spending</p>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 pl-12">{formatCurrency(totalSpent, currency)}</h3>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Receipt className="w-5 h-5" />
            </div>
            <p className="text-slate-500 text-sm font-medium">Total Bills</p>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 pl-12">{billExpenses.length}</h3>
        </div>

         <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-slate-500 text-sm font-medium">Top Payer</p>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 pl-12">
            {userSpending.length > 0 ? userSpending[0].name : '—'}
          </h3>
        </div>
      </div>

      {recurringTemplates.length > 0 && (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-brand-600" />
                Recurring Expenses
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recurringTemplates.map(template => (
                    <div key={template.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-brand-300 transition-colors">
                        <div>
                            <p className="font-medium text-slate-800">{template.description}</p>
                            <p className="text-xs text-slate-500">{formatCurrency(template.amount, currency)} • {users.find(u=>u.id===template.payerId)?.name}</p>
                        </div>
                        <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={() => onQuickAdd(template)}
                            title="Add for this month"
                            icon={<Plus className="w-3 h-3" />}
                        >
                            Add
                        </Button>
                    </div>
                ))}
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Spending by Category</h3>
          <div className="h-64 w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value, currency)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-slate-400">
                 No expenses data available
               </div>
            )}
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h3>
          <div className="flex-1 overflow-auto pr-1 max-h-[300px]">
            {expenses.length === 0 && (
                 <div className="h-32 flex items-center justify-center text-slate-400">
                    No activity yet.
                 </div>
            )}
            <ul className="space-y-3">
              {expenses.slice().reverse().slice(0, 10).map((expense) => {
                  const payer = users.find(u => u.id === expense.payerId);
                  const isSettlement = expense.type === 'SETTLEMENT';
                  
                  return (
                    <li key={expense.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${isSettlement ? 'bg-slate-100' : 'bg-slate-50 hover:bg-slate-100'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold
                                ${isSettlement ? 'bg-slate-600' :
                                  expense.category === Category.FOOD ? 'bg-green-500' : 
                                  expense.category === Category.UTILITIES ? 'bg-blue-500' :
                                  expense.category === Category.ENTERTAINMENT ? 'bg-purple-500' : 
                                  expense.category === Category.HOME ? 'bg-orange-500' : 'bg-slate-400'
                                }`}>
                                {isSettlement ? <ArrowRightLeft className="w-5 h-5" /> : expense.category.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-slate-800">
                                        {isSettlement ? `Payment to ${users.find(u => expense.involvedUserIds.includes(u.id))?.name}` : expense.description}
                                    </p>
                                    {expense.isRecurring && <RefreshCw className="w-3 h-3 text-slate-400" />}
                                </div>
                                <p className="text-xs text-slate-500">{payer?.name} • {expense.date}</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <span className={`block font-semibold ${isSettlement ? 'text-slate-600' : 'text-slate-700'}`}>
                                {formatCurrency(expense.amount, currency)}
                             </span>
                             {!isSettlement && (
                                <span className="text-[10px] text-slate-400">
                                    {expense.involvedUserIds.length === users.length ? 'All' : `${expense.involvedUserIds.length} ppl`}
                                </span>
                             )}
                        </div>
                    </li>
                  );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};