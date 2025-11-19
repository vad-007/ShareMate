
import React from 'react';
import { User, Transaction, Expense } from '../types';
import { formatCurrency, generateCSV, calculateBalances } from '../utils/calculations';
import { CheckCircle2, ArrowRight, Banknote, Download, Check, Copy, Scale } from 'lucide-react';
import { Button } from './Button';

interface SettlementPlanProps {
  transactions: Transaction[];
  users: User[];
  expenses: Expense[];
  currency: string;
  onSettleTransaction: (transaction: Transaction) => void;
}

export const SettlementPlan: React.FC<SettlementPlanProps> = ({ transactions, users, expenses, currency, onSettleTransaction }) => {
  const balances = calculateBalances(expenses, users);
  
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';

  const handleDownloadCSV = () => {
    const csv = generateCSV(expenses, users);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ShareMates_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCopyInstruction = (t: Transaction) => {
      const text = `${getUserName(t.fromUserId)} owes ${getUserName(t.toUserId)} ${formatCurrency(t.amount, currency)} on ShareMates.`;
      navigator.clipboard.writeText(text).then(() => {
          alert("Payment instruction copied to clipboard!");
      });
  };

  if (transactions.length === 0 && Math.abs(Object.values(balances).reduce((a,b)=>a+Math.abs(b),0)) < 0.1) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">All Settled Up!</h3>
        <p className="text-slate-500 mb-6">No debts pending. You guys are awesome.</p>
        
        {expenses.length > 0 && (
            <Button onClick={handleDownloadCSV} variant="outline" size="sm" icon={<Download className="w-4 h-4" />}>
                Download History Report
            </Button>
        )}
      </div>
    );
  }

  // Prepare balance chart data
  const maxBalance = Math.max(...Object.values(balances).map(b => Math.abs(b)), 1);

  return (
    <div className="space-y-6">
        
        {/* Current Balances Visualization */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
                 <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Scale className="w-6 h-6 text-brand-600" />
                    Current Net Balances
                </h2>
                <p className="text-sm text-slate-500 mt-1">Who owes what before optimization.</p>
            </div>
            <div className="p-6 space-y-4">
                {users.map(user => {
                    const balance = balances[user.id] || 0;
                    const isPositive = balance > 0;
                    const isZero = Math.abs(balance) < 0.01;
                    const widthPercent = (Math.abs(balance) / maxBalance) * 50; // 50% is max width from center
                    
                    return (
                        <div key={user.id} className="flex items-center text-sm">
                            <div className="flex-1 flex justify-end items-center gap-2 pr-3">
                                {!isPositive && !isZero && <span className="font-bold text-slate-700">{formatCurrency(Math.abs(balance), currency)}</span>}
                                <div className="h-2 rounded-l-full bg-red-400" style={{ width: !isPositive && !isZero ? `${widthPercent}%` : '0px' }}></div>
                            </div>
                            
                            <div className="w-24 text-center font-medium text-slate-800 flex-shrink-0">
                                {user.name}
                            </div>
                            
                            <div className="flex-1 flex justify-start items-center gap-2 pl-3">
                                <div className="h-2 rounded-r-full bg-green-500" style={{ width: isPositive && !isZero ? `${widthPercent}%` : '0px' }}></div>
                                {isPositive && !isZero && <span className="font-bold text-slate-700">{formatCurrency(balance, currency)}</span>}
                            </div>
                        </div>
                    )
                })}
                <div className="flex justify-between text-xs text-slate-400 px-10 pt-2">
                    <span>Owes (Debtor)</span>
                    <span>Gets Back (Creditor)</span>
                </div>
            </div>
        </div>

        {/* Settlement Plan */}
        {transactions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Banknote className="w-6 h-6 text-brand-600" />
                            Settlement Plan
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Suggested payments to settle all debts efficiently.
                        </p>
                    </div>
                    <Button onClick={handleDownloadCSV} variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>
                        Export Report
                    </Button>
                </div>
                
                <div className="divide-y divide-slate-100">
                    {transactions.map((t, idx) => (
                        <div key={idx} className="p-4 flex flex-col sm:flex-row items-center justify-between hover:bg-slate-50 transition-colors gap-4 group">
                            <div className="flex items-center gap-4 flex-1 w-full sm:w-auto justify-center sm:justify-start">
                                <div className="flex flex-col items-center min-w-[4rem]">
                                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm mb-1" aria-hidden="true">
                                        {getUserName(t.fromUserId).substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="text-xs font-medium text-slate-600">{getUserName(t.fromUserId)}</span>
                                </div>

                                <div className="flex-1 flex flex-col items-center text-slate-400 px-2">
                                    <span className="text-xs mb-1 uppercase tracking-wider font-semibold">Pays</span>
                                    <ArrowRight className="w-5 h-5 text-brand-400" />
                                </div>

                                <div className="flex flex-col items-center min-w-[4rem]">
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm mb-1" aria-hidden="true">
                                        {getUserName(t.toUserId).substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="text-xs font-medium text-slate-600">{getUserName(t.toUserId)}</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                <div className="text-lg font-bold text-slate-800">{formatCurrency(t.amount, currency)}</div>
                                
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleCopyInstruction(t)}
                                        className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors"
                                        title="Copy payment details"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <Button 
                                        onClick={() => onSettleTransaction(t)} 
                                        size="sm" 
                                        variant="outline"
                                        className="text-xs whitespace-nowrap"
                                        icon={<Check className="w-3 h-3" />}
                                    >
                                        Mark Paid
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-400">
                    <p>Share payment instructions via WhatsApp or UPI manually.</p>
                </div>
            </div>
        )}
    </div>
  );
};
