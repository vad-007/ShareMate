
import React, { useState } from 'react';
import { User, Group, Expense } from '../types';
import { Button } from './Button';
import { Plus, Trash2, Users, Copy, Save, Download, AlertTriangle, Settings, Clock, Bell, RefreshCw, UserX, RotateCcw, Shield, Eye, Pencil, X, Check } from 'lucide-react';
import { generateCSV, formatCurrency } from '../utils/calculations';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

interface GroupSettingsProps {
  users: User[];
  group: Group;
  expenses: Expense[];
  onAddUser: (name: string, phoneNumber?: string) => void;
  onUpdateUser: (id: string, updates: Partial<User>) => void;
  onRemoveUser: (id: string) => void;
  onReactivateUser: (id: string) => void;
  onUpdateGroup: (updates: Partial<Group>) => void;
  onDeleteGroup: () => void;
  onToggleRecurring: (expenseId: string) => void;
}

export const GroupSettings: React.FC<GroupSettingsProps> = ({ 
  users, 
  group, 
  expenses,
  onAddUser,
  onUpdateUser,
  onRemoveUser, 
  onReactivateUser,
  onUpdateGroup,
  onDeleteGroup,
  onToggleRecurring
}) => {
  // Group Settings State
  const [editName, setEditName] = useState(group.name);
  const [editCurrency, setEditCurrency] = useState(group.currency);
  const [editTimezone, setEditTimezone] = useState(group.timezone || 'Asia/Kolkata');
  const [notificationPrefs, setNotificationPrefs] = useState(group.notificationPrefs || { push: true, email: false, sms: false });
  const [isDirty, setIsDirty] = useState(false);
  
  // User Management State
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  
  // Edit User State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserPhone, setEditingUserPhone] = useState('');

  // Modals
  const [showPrivacy, setShowPrivacy] = useState(false);

  const activeUsers = users.filter(u => u.isActive !== false);
  const inactiveUsers = users.filter(u => u.isActive === false);
  const recurringExpenses = expenses.filter(e => e.isRecurring);

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
      onAddUser(newUserName.trim(), newUserPhone.trim());
      setNewUserName('');
      setNewUserPhone('');
    }
  };

  const startEditingUser = (user: User) => {
      setEditingUserId(user.id);
      setEditingUserName(user.name);
      setEditingUserPhone(user.phoneNumber || '');
  };

  const saveUserEdit = (id: string) => {
      if (editingUserName.trim()) {
          onUpdateUser(id, { 
              name: editingUserName.trim(), 
              phoneNumber: editingUserPhone.trim() 
          });
          setEditingUserId(null);
      }
  };

  const handleGroupUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim()) {
        onUpdateGroup({
          name: editName.trim(), 
          currency: editCurrency, 
          timezone: editTimezone,
          notificationPrefs
        });
        setIsDirty(false);
        alert("Group settings updated!");
    }
  };

  const copyInviteLink = () => {
    const link = `https://sharemates.app/join/${group.id}`;
    navigator.clipboard.writeText(link).then(() => {
         alert("Invite link copied: " + link);
    });
  };
  
  const handleExport = () => {
    const csv = generateCSV(expenses, users);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ShareMates_${group.name.replace(/\s+/g,'_')}_Export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDeleteGroup = () => {
      const confirmText = `DELETE-${group.name.toUpperCase().replace(/\s/g, '')}`;
      const input = prompt(`DANGER: This will wipe all data locally.\nTo confirm, type "${confirmText}"`);
      if (input === confirmText) {
          onDeleteGroup();
      } else if (input !== null) {
          alert("Incorrect confirmation text. Action cancelled.");
      }
  };

  const getTimeZones = () => {
    if ((Intl as any).supportedValuesOf) {
      return (Intl as any).supportedValuesOf('timeZone');
    }
    return ['Asia/Kolkata', 'America/New_York', 'Europe/London', 'UTC'];
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-12">
      
      {/* General Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
         <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
            <Settings className="w-6 h-6 text-brand-600" />
            General Settings
         </h2>
         
         <form onSubmit={handleGroupUpdate} className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Group Name</label>
                <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => { setEditName(e.target.value); setIsDirty(true); }}
                    className="w-full rounded-lg border-slate-300 border px-4 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                    <select
                        value={editCurrency}
                        onChange={(e) => { setEditCurrency(e.target.value); setIsDirty(true); }}
                        className="w-full rounded-lg border-slate-300 border px-4 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                    >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                       <Clock className="w-3 h-3" /> Timezone
                    </label>
                    <select
                        value={editTimezone}
                        onChange={(e) => { setEditTimezone(e.target.value); setIsDirty(true); }}
                        className="w-full rounded-lg border-slate-300 border px-4 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                    >
                        {getTimeZones().map((tz: string) => (
                           <option key={tz} value={tz}>{tz}</option>
                        ))}
                    </select>
                </div>
             </div>
             
             {/* Notification Prefs */}
             <div className="pt-2">
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                   <Bell className="w-3 h-3" /> Notifications
                </label>
                <div className="flex gap-4">
                    {Object.entries(notificationPrefs).map(([key, val]) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={val}
                              onChange={() => {
                                  setNotificationPrefs(prev => ({...prev, [key]: !val}));
                                  setIsDirty(true);
                              }}
                              className="rounded text-brand-600 focus:ring-brand-500 border-gray-300"
                            />
                            <span className="text-sm capitalize text-slate-600">{key}</span>
                        </label>
                    ))}
                </div>
             </div>
             
             <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                 <Button type="submit" disabled={!isDirty} icon={<Save className="w-4 h-4" />}>
                     Save Changes
                 </Button>
             </div>
         </form>
      </div>
      
      {/* Recurring Expenses Manager */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
               <RefreshCw className="w-5 h-5 text-brand-600" />
               Recurring Expenses
          </h3>
          {recurringExpenses.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No recurring expenses found.</p>
          ) : (
              <div className="space-y-3">
                  {recurringExpenses.map(exp => (
                      <div key={exp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex flex-col">
                              <span className="font-medium text-slate-800">{exp.description}</span>
                              <div className="text-xs text-slate-500 flex items-center gap-2">
                                 <span>{formatCurrency(exp.amount, group.currency)}</span>
                                 <span>•</span>
                                 <span>Monthly</span>
                              </div>
                          </div>
                          <button 
                             onClick={() => onToggleRecurring(exp.id)}
                             className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-full hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                          >
                              Stop Recurring
                          </button>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* Member Management */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-6">
           <div>
             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               <Users className="w-5 h-5 text-brand-600" />
               Housemates
             </h3>
           </div>
           <Button variant="outline" size="sm" onClick={copyInviteLink} icon={<Copy className="w-4 h-4" />}>
             Invite Link
           </Button>
        </div>

        <div className="mb-8">
           <div className="space-y-3">
             {/* Active Users */}
             {activeUsers.map(user => (
               <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                 <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold flex-shrink-0">
                      {user.name.substring(0, 2).toUpperCase()}
                    </div>
                    
                    {editingUserId === user.id ? (
                        <div className="flex-1 flex flex-col gap-2 mr-2">
                            <input 
                                type="text" 
                                value={editingUserName}
                                onChange={(e) => setEditingUserName(e.target.value)}
                                className="w-full text-sm border-slate-300 rounded px-2 py-1"
                                placeholder="Name"
                            />
                            <input 
                                type="tel" 
                                value={editingUserPhone}
                                onChange={(e) => setEditingUserPhone(e.target.value)}
                                className="w-full text-xs border-slate-300 rounded px-2 py-1"
                                placeholder="Phone Number"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            <span className="font-medium text-slate-800">{user.name}</span>
                            <span className="text-xs text-slate-400">{user.phoneNumber || user.role || 'MEMBER'}</span>
                        </div>
                    )}
                 </div>

                 <div className="flex items-center gap-1">
                    {editingUserId === user.id ? (
                        <>
                            <button onClick={() => saveUserEdit(user.id)} className="p-2 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4"/></button>
                            <button onClick={() => setEditingUserId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded"><X className="w-4 h-4"/></button>
                        </>
                    ) : (
                        <button 
                           onClick={() => startEditingUser(user)}
                           className="text-slate-400 hover:text-brand-600 transition-colors p-2"
                           title="Edit Details"
                        >
                           <Pencil className="w-4 h-4" />
                        </button>
                    )}
                    
                    {users.length > 1 && (
                        <button 
                        onClick={() => onRemoveUser(user.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-2"
                        title="Deactivate User"
                        >
                        <UserX className="w-5 h-5" />
                        </button>
                    )}
                 </div>
               </div>
             ))}
             
             {/* Inactive Users */}
             {inactiveUsers.length > 0 && (
                <div className="pt-4">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Former Members</h5>
                    {inactiveUsers.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-lg border border-slate-100 border-dashed">
                            <div className="flex items-center gap-3 opacity-60">
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
                                {user.name.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-slate-600">{user.name}</span>
                            </div>
                            <button 
                                onClick={() => onReactivateUser(user.id)}
                                className="text-slate-400 hover:text-green-600 transition-colors p-2"
                                title="Reactivate User"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
             )}
           </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Add New Housemate</h4>
          <form onSubmit={handleAddUserSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-3">
                <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Name"
                    className="flex-[2] rounded-lg border-slate-300 border px-4 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                />
                <input
                    type="tel"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="Phone (Optional)"
                    className="flex-1 rounded-lg border-slate-300 border px-4 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                />
            </div>
            <Button type="submit" disabled={!newUserName.trim()} icon={<Plus className="w-4 h-4" />}>
              Add
            </Button>
          </form>
        </div>
      </div>
      
      {/* Data Management */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
         <h3 className="text-lg font-bold text-slate-800 mb-4">Data Management</h3>
         <div className="flex items-center justify-between">
             <div>
                 <p className="text-sm text-slate-600 font-medium">Export Expenses</p>
                 <p className="text-xs text-slate-400">Download a CSV file of all expense history.</p>
             </div>
             <Button variant="secondary" onClick={handleExport} icon={<Download className="w-4 h-4" />}>
                 Export CSV
             </Button>
         </div>
      </div>

      {/* Privacy & Security Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-brand-600" />
            Privacy & Security
          </h3>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600 max-w-sm">
              Learn how your data is stored locally, how we handle encryption, and your data rights.
            </p>
            <Button variant="secondary" onClick={() => setShowPrivacy(true)} icon={<Eye className="w-4 h-4" />}>
              Policy
            </Button>
          </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-6">
         <h3 className="text-lg font-bold text-red-700 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
         </h3>
         <div className="flex items-center justify-between">
             <div>
                 <p className="text-sm text-red-800 font-medium">Delete Group</p>
                 <p className="text-xs text-red-600/80">Irreversibly deletes all users, expenses, and settings from this device.</p>
             </div>
             <Button variant="danger" onClick={handleDeleteGroup} icon={<Trash2 className="w-4 h-4" />}>
                 Delete Group
             </Button>
         </div>
      </div>

      {/* Privacy Modal */}
      {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}
    </div>
  );
};
