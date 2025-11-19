import React, { useState } from 'react';
import { User } from '../types';
import { Button } from './Button';
import { Plus, Trash2, Users, Copy } from 'lucide-react';

interface GroupSettingsProps {
  users: User[];
  onAddUser: (name: string) => void;
  onRemoveUser: (id: string) => void;
}

export const GroupSettings: React.FC<GroupSettingsProps> = ({ users, onAddUser, onRemoveUser }) => {
  const [newUserName, setNewUserName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
      onAddUser(newUserName.trim());
      setNewUserName('');
    }
  };

  const copyInviteLink = () => {
    // Mock functionality
    alert("Invite link copied to clipboard: sharemates.app/join/group-xyz");
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-6">
           <div>
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
               <Users className="w-6 h-6 text-brand-600" />
               House Group Settings
             </h2>
             <p className="text-slate-500 text-sm mt-1">Manage your housemates and group details.</p>
           </div>
           <Button variant="outline" size="sm" onClick={copyInviteLink} icon={<Copy className="w-4 h-4" />}>
             Invite Link
           </Button>
        </div>

        <div className="mb-8">
           <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Housemates</h3>
           <div className="space-y-3">
             {users.map(user => (
               <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">
                      {user.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-800">{user.name}</span>
                 </div>
                 {users.length > 2 && (
                    <button 
                      onClick={() => onRemoveUser(user.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-2"
                      title="Remove User"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                 )}
               </div>
             ))}
           </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Add New Housemate</h3>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Enter name..."
              className="flex-1 rounded-lg border-slate-300 border px-4 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            />
            <Button type="submit" disabled={!newUserName.trim()} icon={<Plus className="w-4 h-4" />}>
              Add
            </Button>
          </form>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
        <div className="text-blue-600">ℹ️</div>
        <p className="text-sm text-blue-700">
          Adding a new housemate will include them in future expenses. Existing settlement calculations will update automatically.
        </p>
      </div>
    </div>
  );
};