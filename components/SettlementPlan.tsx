import React, { useState } from 'react';
import { User, Transaction, Expense } from '../types';
import { formatCurrency, generateCSV, calculateDetailedStats } from '../utils/calculations';
import { CheckCircle2, ArrowRight, Banknote, Download, Check, Copy, BarChart3, MessageCircle, Info } from 'lucide-react';
import { Button } from './Button';

interface SettlementPlanProps {
  transactions: Transaction[];
  users: User[];
  expenses: Expense[];
  currency: string;
  onSettleTransaction: (transaction: Transaction) => void;
}

export const SettlementPlan: React.FC<SettlementPlanProps> = ({ transactions, users, expenses, currency, onSettleTransaction }) => {
  const [showDetails, setShowDetails] = useState(true);
  
  // Use the detailed stats function to get Paid vs Share
  const stats = calculateDetailedStats(expenses, users);
  
  const getUser = (id: string) => users.find(u => u.id === id);
  const getUserName = (id: string) => getUser(id)?.name || 'Unknown';

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

  const handleWhatsAppClick = (t: Transaction) => {
      const creditor = getUser(t.toUserId);
      const debtor = getUser(t.fromUserId);
      const amount = formatCurrency(t.amount, currency);
      
      const text = `Hi ${creditor?.name}, sending you ${amount} to settle my ShareMates balance.`;
      
      let url = '';
      if (creditor?.phoneNumber) {
          const cleanPhone = creditor.phoneNumber.replace(/\D/g, '');
          url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
      } else {
          url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      }
      
      window.open(url, '_blank');
  };

  // Check if fully settled
  const isSettled = transactions.length === 0 && Object.values(stats).every(s => Math.abs(s.balance) < 0.1);

  if (isSettled) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">All Settled Up!</h3>
        <p className="text-slate-500 mb-6">Everyone has paid their fair share.</p>
        
        {expenses.length > 0 && (
            <Button onClick={handleDownloadCSV} variant="outline" size="sm" icon={<Download className="w-4 h-4" />}>
                Download History Report
            </Button>
        )}
      </div>
    );
  }

  // Find max value for bar chart scaling
  const maxVal = Math.max(...Object.values(stats).map(s => Math.max(s.paid, s.share)), 1);

  return (
    <div className="space-y-6">
        
        {/* Spending Analysis / Fairness Check */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                 <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-brand-600" />
                        Spending Analysis
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Total Paid vs. Fair Share</p>
                 </div>
                 <button 
                   onClick={() => setShowDetails(!showDetails)}
                   className="text-xs text-brand-600 font-medium hover:underline"
                 >
                   {showDetails ? 'Hide' : 'Show'} Details
                 </button>
            </div>
            
            {showDetails && (
                <div className="p-6 space-y-6">
                    {/* Visual Chart */}
                    <div className="space-y-4">
                        {users.map(user => {
                            const userStat = stats[user.id] || { paid: 0, share: 0, balance: 0 };
                            return (
                                <div key={user.id} className="space-y-1.5">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-semibold text-slate-700">{user.name}</span>
                                        <div className="text-right text-xs">
                                            <span className={userStat.balance >= 0 ? 'text-emerald-600' : 'text-rose-500'}>
                                                Net: {userStat.balance >= 0 ? '+' : ''}{formatCurrency(userStat.balance, currency)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Stacked/Comparison Bar */}
                                    <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden flex text-[10px] text-white font-bold leading-none">
                                        {/* Paid Bar */}
                                        <div 
                                            className="bg-emerald-400 h-full flex items-center justify-center transition-all duration-500" 
                                            style={{ width: `${(userStat.paid / maxVal) * 100}%` }}
                                            title={`Paid: ${formatCurrency(userStat.paid, currency)}`}
                                        >
                                            {userStat.paid > 0 && <span className="opacity-80 px-1">Paid</span>}
                                        </div>
                                        {/* Share Marker (Overlay) */}
                                        <div 
                                            className="absolute top-0 bottom-0 border-r-2 border-blue-500 z-10 transition-all duration-500"
                                            style={{ left: `${(userStat.share / maxVal) * 100}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-400 px-1">
                                        <span>Paid: {formatCurrency(userStat.paid, currency)}</span>
                                        <span className="text-blue-500 font-medium">Share: {formatCurrency(userStat.share, currency)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Detailed Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-50">
                                <tr>
                                    <th className="px-3 py-2 rounded-l-lg">Member</th>
                                    <th className="px-3 py-2 text-right text-emerald-600">Total Paid</th>
                                    <th className="px-3 py-2 text-right text-blue-600">Fair Share</th>
                                    <th className="px-3 py-2 text-right rounded-r-lg">Net Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {users.map(user => {
                                    const s = stats[user.id] || { paid: 0, share: 0, balance: 0 };
                                    return (
                                        <tr key={user.id}>
                                            <td className="px-3 py-2 font-medium text-slate-700">{user.name}</td>
                                            <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(s.paid, currency)}</td>
                                            <td className="px-3 py-2 text-right text-slate-600 font-medium">{formatCurrency(s.share, currency)}</td>
                                            <td className={`px-3 py-2 text-right font-bold ${s.balance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                {s.balance > 0 ? '+' : ''}{formatCurrency(s.balance, currency)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-lg flex gap-2 items-start text-xs text-blue-700">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>
                            <strong>How this works:</strong> "Fair Share" is what you <em>should</em> have paid based on splits. 
                            If you paid <strong>more</strong> than your share, you get money back. 
                            If you paid <strong>less</strong>, you owe the difference.
                        </p>
                    </div>
                </div>
            )}
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
                            Efficient transfers to settle all debts.
                        </p>
                    </div>
                    <Button onClick={handleDownloadCSV} variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>
                        Export
                    </Button>
                </div>
                
                <div className="divide-y divide-slate-100">
                    {transactions.map((t, idx) => (
                        <div key={idx} className="p-4 flex flex-col sm:flex-row items-center justify-between hover:bg-slate-50 transition-colors gap-4 group">
                            <div className="flex items-center gap-4 flex-1 w-full sm:w-auto justify-center sm:justify-start">
                                <div className="flex flex-col items-center min-w-[4rem]">
                                    <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm mb-1 shadow-sm">
                                        {getUserName(t.fromUserId).substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="text-xs font-medium text-slate-600">{getUserName(t.fromUserId)}</span>
                                </div>

                                <div className="flex-1 flex flex-col items-center px-4">
                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">PAYS</span>
                                    <div className="h-0.5 w-full bg-slate-200 relative">
                                        <ArrowRight className="w-4 h-4 text-slate-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-0.5" />
                                    </div>
                                </div>

                                <div className="flex flex-col items-center min-w-[4rem]">
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm mb-1 shadow-sm">
                                        {getUserName(t.toUserId).substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="text-xs font-medium text-slate-600">{getUserName(t.toUserId)}</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 mt-1 sm:mt-0">
                                <div className="text-lg font-bold text-slate-800 tabular-nums">{formatCurrency(t.amount, currency)}</div>
                                
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleWhatsAppClick(t)}
                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors border border-transparent hover:border-emerald-200"
                                        title="Share on WhatsApp"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                    </button>
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
            </div>
        )}
    </div>
  );
};