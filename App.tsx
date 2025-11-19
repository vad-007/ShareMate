
import React, { useState, useMemo, useEffect } from 'react';
import { Home, PlusCircle, Users, Banknote, Menu, X, Settings, LogOut } from 'lucide-react';
import { User, Expense, Category, Transaction, ConfirmationStatus, Group } from './types';
import { Dashboard } from './components/Dashboard';
import { ExpenseForm } from './components/ExpenseForm';
import { SettlementPlan } from './components/SettlementPlan';
import { GroupSettings } from './components/GroupSettings';
import { Onboarding } from './components/Onboarding';
import { Toast, ToastType } from './components/Toast';
import { QuickAddModal } from './components/QuickAddModal';
import { ExpenseDetailModal } from './components/ExpenseDetailModal';
import { calculateSettlements, generateWhatsAppLink } from './utils/calculations';

// Initial Data
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

  const [group, setGroup] = useState<Group | null>(() => {
    const saved = localStorage.getItem('sharemates_group');
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
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  
  // Modal States
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
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

  useEffect(() => {
    if (group) {
        localStorage.setItem('sharemates_group', JSON.stringify(group));
    } else {
        localStorage.removeItem('sharemates_group');
    }
  }, [group]);

  // --- Calculations ---
  const transactions = useMemo(() => calculateSettlements(expenses, users), [expenses, users]);
  const hasDebts = transactions.length > 0;

  // --- Helpers ---
  const createInitialConfirmations = (involvedIds: string[], payerId: string): { [userId: string]: ConfirmationStatus } => {
      const confs: { [userId: string]: ConfirmationStatus } = {};
      involvedIds.forEach(id => {
          confs[id] = id === payerId ? 'CONFIRMED' : 'PENDING';
      });
      return confs;
  };

  // --- Handlers ---
  const showToast = (msg: string, type: ToastType = 'success', action?: { label: string; onClick: () => void }) => {
    setToast({ msg, type, visible: true, action });
  };

  const triggerNotificationSimulation = (expense: Expense, involvedCount: number) => {
      showToast(`Notifying ${involvedCount} members...`, 'info');
      
      setTimeout(() => {
          const link = generateWhatsAppLink(expense, group?.currency || 'INR');
          showToast(
            "Expense saved! Notifications sent.", 
            'success', 
            { 
                label: "Share on WhatsApp", 
                onClick: () => window.open(link, '_blank') 
            }
          );
      }, 1500);
  };

  const handleOnboardingComplete = (userName: string, groupName: string, currency: string) => {
      const newMe: User = {
          id: `u-${Date.now()}`,
          name: userName,
          avatarUrl: '',
          role: 'ADMIN',
          isActive: true
      };
      
      const newGroup: Group = {
          id: `g-${Date.now()}`,
          name: groupName,
          currency: currency,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          createdBy: newMe.id,
          createdAt: new Date().toISOString(),
          notificationPrefs: { push: true, email: true, sms: false }
      };

      setCurrentUser(newMe);
      setGroup(newGroup);
      
      if (users.length === 0) {
          setUsers([newMe]);
      } else {
          setUsers(prev => [...prev, newMe]);
      }
      showToast(`Welcome, ${userName}! Group '${groupName}' created.`);
  };

  const handleLogout = () => {
      if(confirm("Are you sure you want to logout? This is a local demo.")) {
          setCurrentUser(null);
          setCurrentView(View.DASHBOARD);
      }
  };

  // Generic handler for creating OR updating expense from standard form
  const handleExpenseFormSubmit = (data: any) => {
    if (!currentUser) return;

    if (editingExpense) {
        // Update Existing
        const updatedExpense: Expense = {
            ...editingExpense,
            ...data,
            // Preserve confirmations if not changed significantly, or reset? 
            // For MVP, let's reset confirmations if amount/splits change, but keeping simple:
            confirmations: createInitialConfirmations(data.involvedUserIds, data.payerId) 
        };

        setExpenses(prev => prev.map(e => e.id === editingExpense.id ? updatedExpense : e));
        showToast("Expense updated successfully");
        setEditingExpense(null); // Close edit mode
        setSelectedExpense(updatedExpense); // Re-open details with new data
    } else {
        // Create New
        const newExpense: Expense = {
          ...data,
          id: Math.random().toString(36).substring(2, 9),
          audit: {
             createdBy: currentUser.id,
             createdAt: new Date().toISOString(),
             voiceNoteAttached: false
          },
          confirmations: createInitialConfirmations(data.involvedUserIds, data.payerId)
        };
        setExpenses(prev => [...prev, newExpense]);
        setCurrentView(View.DASHBOARD);
        triggerNotificationSimulation(newExpense, newExpense.involvedUserIds.length - 1);
    }
  };

  const handleSaveQuickAdd = (data: Partial<Expense>, notify: boolean) => {
      if (!currentUser || !data.amount || !data.description || !data.payerId) return;
      
      const involved = data.involvedUserIds || users.filter(u => u.isActive !== false).map(u => u.id);
      const newExpense: Expense = {
          id: `qa-${Date.now()}`,
          description: data.description,
          amount: data.amount,
          payerId: data.payerId,
          date: data.date || new Date().toISOString().split('T')[0],
          category: data.category || Category.OTHER,
          involvedUserIds: involved,
          isRecurring: false,
          type: 'BILL',
          splitType: 'EQUAL',
          audit: {
             createdBy: currentUser.id,
             createdAt: new Date().toISOString(),
             voiceNoteAttached: data.audit?.voiceNoteAttached
          },
          confirmations: createInitialConfirmations(involved, data.payerId)
      };

      setExpenses(prev => [...prev, newExpense]);
      setIsQuickAddOpen(false);
      
      if (notify) {
          triggerNotificationSimulation(newExpense, involved.length - (involved.includes(newExpense.payerId) ? 1 : 0));
      } else {
          showToast("Quick Add saved successfully.");
      }
  };

  const handleDeleteExpense = (expenseId: string) => {
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
      showToast("Expense deleted.");
      setSelectedExpense(null);
  };

  const handleToggleConfirmation = (expenseId: string, status: ConfirmationStatus) => {
      if (!currentUser) return;
      setExpenses(prev => prev.map(e => {
          if (e.id === expenseId) {
              const newConfs = { ...e.confirmations, [currentUser.id]: status };
              return { ...e, confirmations: newConfs };
          }
          return e;
      }));
      
      if (status === 'FLAGGED') showToast("Expense flagged for review.", 'error');
      if (status === 'CONFIRMED') showToast("Expense confirmed!", 'success');
  };

  const handleQuickSplit = (description: string, amount: number) => {
      if (!currentUser) return;
      const involved = users.filter(u => u.isActive !== false).map(u => u.id);
      const newExpense: Expense = {
          id: `q-${Date.now()}`,
          description,
          amount,
          payerId: currentUser.id,
          date: new Date().toISOString().split('T')[0],
          category: Category.OTHER,
          involvedUserIds: involved,
          isRecurring: false,
          type: 'BILL',
          splitType: 'EQUAL',
          audit: {
              createdBy: currentUser.id,
              createdAt: new Date().toISOString()
          },
          confirmations: createInitialConfirmations(involved, currentUser.id)
      };
      setExpenses(prev => [...prev, newExpense]);
      triggerNotificationSimulation(newExpense, involved.length - 1);
  };

  const handleQuickAddTemplate = (template: Expense) => {
      if (!currentUser) return;
      const newExpense: Expense = {
          ...template,
          id: Math.random().toString(36).substring(2, 9),
          date: new Date().toISOString().split('T')[0],
          isRecurring: true,
          audit: {
              createdBy: currentUser.id,
              createdAt: new Date().toISOString()
          },
          confirmations: createInitialConfirmations(template.involvedUserIds, template.payerId)
      };
      setExpenses(prev => [...prev, newExpense]);
      triggerNotificationSimulation(newExpense, newExpense.involvedUserIds.length - 1);
  };

  const handleSettleTransaction = (txn: Transaction) => {
      if (!currentUser) return;
      const symbol = group?.currency === 'INR' ? '₹' : group?.currency || '$';
      
      if (!window.confirm(`Record payment of ${symbol} ${txn.amount} from ${users.find(u=>u.id===txn.fromUserId)?.name} to ${users.find(u=>u.id===txn.toUserId)?.name}?`)) {
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
          type: 'SETTLEMENT',
          audit: {
              createdBy: currentUser.id,
              createdAt: new Date().toISOString()
          }
      };

      setExpenses(prev => [...prev, settlementExpense]);
      showToast('Payment recorded and balance updated');
  };

  const handleAddUser = (name: string) => {
    const newUser: User = {
      id: `u${Date.now()}`,
      name,
      role: 'MEMBER',
      isActive: true
    };
    setUsers(prev => [...prev, newUser]);
    showToast(`${name} added to group`);
  };

  const handleRemoveUser = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: false } : u));
    showToast("User deactivated (History preserved)");
  };
  
  const handleReactivateUser = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: true } : u));
    showToast("User reactivated");
  }

  const handleUpdateGroup = (updates: Partial<Group>) => {
      if (!group) return;
      setGroup({ ...group, ...updates });
  };

  const handleDeleteGroup = () => {
      localStorage.clear();
      setGroup(null);
      setCurrentUser(null);
      setUsers([]);
      setExpenses([]);
      window.location.reload();
  };

  const handleToggleRecurring = (expenseId: string) => {
      setExpenses(prev => prev.map(e => 
          e.id === expenseId ? { ...e, isRecurring: !e.isRecurring } : e
      ));
      showToast("Recurrence updated");
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

  if (!currentUser || !group) {
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
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView(View.DASHBOARD)}>
                <div className="bg-brand-600 p-1.5 rounded-lg">
                    <Users className="h-6 w-6 text-white" />
                </div>
                <div className="flex flex-col leading-tight">
                    <span className="font-bold text-lg text-brand-900 tracking-tight">ShareMates</span>
                    <span className="text-xs text-slate-500 font-medium">{group.name}</span>
                </div>
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
        </div>

        {/* Views */}
        {currentView === View.DASHBOARD && (
          <Dashboard 
            expenses={expenses} 
            users={users} 
            currentUser={currentUser}
            currency={group.currency} 
            onQuickAddTemplate={handleQuickAddTemplate}
            onQuickSplit={handleQuickSplit}
            onOpenQuickAddModal={() => setIsQuickAddOpen(true)}
            onToggleConfirmation={handleToggleConfirmation}
            onExpenseClick={(expense) => setSelectedExpense(expense)}
          />
        )}

        {currentView === View.ADD_EXPENSE && (
           <div className="flex justify-center">
              <ExpenseForm 
                users={users} 
                currentUser={currentUser}
                onSubmit={handleExpenseFormSubmit}
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
                    currency={group.currency}
                    onSettleTransaction={handleSettleTransaction} 
                />
            </div>
        )}

        {currentView === View.GROUP && (
            <GroupSettings 
              users={users}
              group={group}
              expenses={expenses}
              onAddUser={handleAddUser} 
              onRemoveUser={handleRemoveUser}
              onReactivateUser={handleReactivateUser}
              onUpdateGroup={handleUpdateGroup}
              onDeleteGroup={handleDeleteGroup}
              onToggleRecurring={handleToggleRecurring}
            />
        )}
      </main>

      {/* Modals */}
      {isQuickAddOpen && (
          <QuickAddModal 
            users={users}
            currentUser={currentUser}
            onClose={() => setIsQuickAddOpen(false)}
            onSave={handleSaveQuickAdd}
            currency={group.currency}
          />
      )}
      
      {selectedExpense && !editingExpense && (
          <ExpenseDetailModal
            expense={selectedExpense}
            users={users}
            currency={group.currency}
            currentUser={currentUser}
            onClose={() => setSelectedExpense(null)}
            onEdit={(exp) => setEditingExpense(exp)}
            onDelete={handleDeleteExpense}
          />
      )}

      {editingExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
             <ExpenseForm 
                 users={users}
                 currentUser={currentUser}
                 initialData={editingExpense}
                 onSubmit={handleExpenseFormSubmit}
                 onCancel={() => setEditingExpense(null)}
             />
          </div>
      )}

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
