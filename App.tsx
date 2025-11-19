import React, { useState, useMemo, useEffect } from 'react';
import { Home, PlusCircle, Users, Banknote, Menu, X, Settings, LogOut } from 'lucide-react';
import { User, Expense, Category, Transaction } from './types';
import { Dashboard } from './components/Dashboard';
import { ExpenseForm } from './components/ExpenseForm';
import { SettlementPlan } from './components/SettlementPlan';
import { GroupSettings } from './components/GroupSettings';
import { Onboarding } from './components/Onboarding';
import { Toast, ToastType } from './components/Toast';
import { calculateSettlements, generateWhatsAppLink } from './utils/calculations';

// Initial Data (for demo purposes if local storage is empty AND bypassed)
const INITIAL_USERS_DEFAULT: User[] = [];
const INITIAL_EXPENSES_DEFAULT: Expense[] = [];

enum View {
  DASHBOARD = 'Dashboard',
  ADD_EXPENSE = 'Add Expense',
  SETTLEMENT = 'Settlement',
  GROUP = 'Group'
}

function App() {
  // --- State ---
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('sharemates_currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('sharemates_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS_DEFAULT;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('sharemates_expenses');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES_DEFAULT;
  });

  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currency, setCurrency] = useState('INR');
  
  // Toast State
  const [toast, setToast] = useState<{ msg: string; type: ToastType; visible: boolean; action?: { label: string; onClick: () => void } }>({
    msg: '', type: 'success', visible: false
  });

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('sharemates_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('sharemates_expenses', JSON.stringify(expenses));
  }, [expenses]);
  
  useEffect(() => {
    if (currentUser) {
        localStorage.setItem('sharemates_currentUser', JSON.stringify(currentUser));
    } else {
        localStorage.removeItem('sharemates_currentUser');
    }
  }, [currentUser]);

  // --- Calculations ---
  const transactions = useMemo(() => calculateSettlements(expenses, users), [expenses, users]);
  const hasDebts = transactions.length > 0;

  // --- Handlers ---
  const showToast = (msg: string, type: ToastType = 'success', action?: { label: string; onClick: () => void }) => {
    setToast({ msg, type, visible: true, action });
  };

  const triggerNotificationSimulation = (expense: Expense) => {
      // Simulate sending push notifications
      showToast("Sending notifications to group...", 'info');
      
      setTimeout(() => {
          const link = generateWhatsAppLink(expense, currency);
          showToast(
            "Expense added & members notified!", 
            'success', 
            { 
                label: "Share on WhatsApp", 
                onClick: () => window.open(link, '_blank') 
            }
          );
      }, 1500);
  };

  const handleOnboardingComplete = (userName: string, groupName: string) => {
      const newMe: User = {
          id: `u-${Date.now()}`,
          name: userName,
          avatarUrl: ''
      };
      setCurrentUser(newMe);
      
      // Initialize group with just me if empty
      if (users.length === 0) {
          setUsers([newMe]);
      } else {
          // If users exist (re-login scenario without clear), just add me if not there
          // For this MVP, we assume new onboarding = new start or just appending self
          setUsers(prev => [...prev, newMe]);
      }
      showToast(`Welcome, ${userName}! Group '${groupName}' created.`);
  };

  const handleLogout = () => {
      if(confirm("Are you sure you want to logout? This is a local demo.")) {
          setCurrentUser(null);
          // Optional: clear data? For now, keep data for persistence demo
          setCurrentView(View.DASHBOARD);
      }
  };

  const handleAddExpense = (data: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...data,
      id: Math.random().toString(36).substring(2, 9),
    };
    setExpenses(prev => [...prev, newExpense]);
    setCurrentView(View.DASHBOARD);
    triggerNotificationSimulation(newExpense);
  };

  const handleQuickAddTemplate = (template: Expense) => {
    const newExpense: Expense = {
        ...template,
        id: Math.random().toString(36).substring(2, 9),
        date: new Date().toISOString().split('T')[0], // Set to today
        isRecurring: true
    };
    setExpenses(prev => [...prev, newExpense]);
    triggerNotificationSimulation(newExpense);
  };

  const handleQuickSplit = (description: string, amount: number) => {
      if (!currentUser) return;
      
      const newExpense: Expense = {
          id: `q-${Date.now()}`,
          description,
          amount,
          payerId: currentUser.id,
          date: new Date().toISOString().split('T')[0],
          category: Category.OTHER,
          involvedUserIds: users.map(u => u.id), // Split with everyone
          isRecurring: false,
          type: 'BILL',
          splitType: 'EQUAL'
      };
      
      setExpenses(prev => [...prev, newExpense]);
      triggerNotificationSimulation(newExpense);
  };

  const handleSettleTransaction = (txn: Transaction) => {
      if (!window.confirm(`Record payment of ${currency === 'INR' ? '₹' : currency} ${txn.amount} from ${users.find(u=>u.id===txn.fromUserId)?.name} to ${users.find(u=>u.id===txn.toUserId)?.name}?`)) {
          return;
      }
      
      const settlementExpense: Expense = {
          id: `stlmnt-${Date.now()}`,
          description: `Payment to ${users.find(u => u.id === txn.toUserId)?.name}`,
          amount: txn.amount,
          payerId: txn.fromUserId,
          involvedUserIds: [txn.toUserId],
          date: new Date().toISOString().split('T')[0],
          category: Category.SETTLEMENT,
          isRecurring: false,
          type: 'SETTLEMENT'
      };

      setExpenses(prev => [...prev, settlementExpense]);
      showToast('Payment recorded and balance updated');
  };

  const handleAddUser = (name: string) => {
    const newUser: User = {
      id: `u${Date.now()}`,
      name
    };
    setUsers(prev => [...prev, newUser]);
    showToast(`${name} added to group`);
  };

  const handleRemoveUser = (id: string) => {
    const isInvolved = expenses.some(e => e.payerId === id || e.involvedUserIds.includes(id));
    if (isInvolved) {
        showToast("Cannot remove user with active history", 'error');
        return;
    }
    setUsers(prev => prev.filter(u => u.id !== id));
    showToast("User removed");
  };

  const NavItem = ({ view, icon, label }: { view: View, icon: React.ReactNode, label: string }) => (
    <button
      onClick={() => { setCurrentView(view); setIsMobileMenuOpen(false); }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all w-full md:w-auto
        ${currentView === view 
          ? 'bg-brand-100 text-brand-800 font-semibold' 
          : 'text-slate-600 hover:bg-slate-100'
        }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  // --- Render Onboarding if not logged in ---
  if (!currentUser) {
      return (
          <>
            <Onboarding onComplete={handleOnboardingComplete} />
            <Toast 
                message={toast.msg} 
                type={toast.type} 
                isVisible={toast.visible} 
                onClose={() => setToast(prev => ({ ...prev, visible: false }))}
                action={toast.action}
            />
          </>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView(View.DASHBOARD)}>
                <div className="bg-brand-600 p-1.5 rounded-lg">
                    <Users className="h-6 w-6 text-white" />
                </div>
                <span className="font-bold text-xl text-brand-900 tracking-tight">ShareMates</span>
              </div>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex md:items-center md:space-x-2">
              <NavItem view={View.DASHBOARD} icon={<Home className="w-5 h-5"/>} label="Dashboard" />
              <NavItem view={View.SETTLEMENT} icon={<Banknote className="w-5 h-5"/>} label="Settlement" />
              <NavItem view={View.GROUP} icon={<Settings className="w-5 h-5"/>} label="Group" />
              <div className="w-px h-6 bg-slate-200 mx-2"></div>
              <button 
                onClick={() => setCurrentView(View.ADD_EXPENSE)}
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Add Expense</span>
              </button>
              <button 
                onClick={handleLogout}
                className="ml-2 text-slate-400 hover:text-red-500 p-2"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-2 pt-2 pb-3 space-y-1 shadow-lg absolute w-full z-40">
             <NavItem view={View.DASHBOARD} icon={<Home className="w-5 h-5"/>} label="Dashboard" />
             <NavItem view={View.ADD_EXPENSE} icon={<PlusCircle className="w-5 h-5"/>} label="Add Expense" />
             <NavItem view={View.SETTLEMENT} icon={<Banknote className="w-5 h-5"/>} label="Settlement" />
             <NavItem view={View.GROUP} icon={<Settings className="w-5 h-5"/>} label="Group Settings" />
             <button 
                 onClick={handleLogout}
                 className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all w-full text-red-500 hover:bg-red-50"
             >
                 <LogOut className="w-5 h-5" />
                 <span>Logout</span>
             </button>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
           <div>
             <h1 className="text-3xl font-bold text-slate-900">{currentView}</h1>
             {currentView === View.DASHBOARD && (
               <p className="text-slate-500 mt-1">Hi {currentUser.name}! {hasDebts ? 'There are pending debts.' : 'You are all settled up.'}</p>
             )}
           </div>
           
           {currentView === View.DASHBOARD && (
             <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2"
             >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
             </select>
           )}
        </div>

        {/* Views */}
        {currentView === View.DASHBOARD && (
          <Dashboard 
            expenses={expenses} 
            users={users} 
            currency={currency} 
            onQuickAdd={handleQuickAddTemplate}
            onQuickSplit={handleQuickSplit}
          />
        )}

        {currentView === View.ADD_EXPENSE && (
           <div className="flex justify-center">
              <ExpenseForm 
                users={users} 
                currentUser={currentUser}
                onAddExpense={handleAddExpense}
                onCancel={() => setCurrentView(View.DASHBOARD)} 
              />
           </div>
        )}

        {currentView === View.SETTLEMENT && (
            <div className="max-w-3xl mx-auto">
                <SettlementPlan 
                    transactions={transactions} 
                    users={users} 
                    expenses={expenses}
                    currency={currency}
                    onSettleTransaction={handleSettleTransaction} 
                />
            </div>
        )}

        {currentView === View.GROUP && (
            <GroupSettings 
              users={users} 
              onAddUser={handleAddUser} 
              onRemoveUser={handleRemoveUser} 
            />
        )}
      </main>

      <Toast 
        message={toast.msg} 
        type={toast.type} 
        isVisible={toast.visible} 
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
        action={toast.action}
      />
    </div>
  );
}

export default App;