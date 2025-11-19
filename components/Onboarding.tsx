import React, { useState } from 'react';
import { Button } from './Button';
import { Users, ArrowRight } from 'lucide-react';

interface OnboardingProps {
  onComplete: (userName: string, groupName: string) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [groupName, setGroupName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && groupName.trim()) {
      onComplete(name.trim(), groupName.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8">
        <div className="flex justify-center mb-6">
          <div className="bg-brand-100 p-4 rounded-full">
            <Users className="w-8 h-8 text-brand-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Welcome to ShareMates</h1>
        <p className="text-slate-500 text-center mb-8">Split bills and manage expenses with your housemates easily.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">What's your name?</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border-slate-300 border px-4 py-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
              placeholder="e.g., Rohan"
            />
          </div>
          
          <div>
            <label htmlFor="group" className="block text-sm font-medium text-slate-700 mb-1">Group Name</label>
            <input
              id="group"
              type="text"
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full rounded-lg border-slate-300 border px-4 py-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
              placeholder="e.g., Apartment 402"
            />
            <p className="text-xs text-slate-400 mt-1">Create a new group or join an existing one.</p>
          </div>

          <Button 
            type="submit" 
            className="w-full justify-center py-3 text-lg"
            disabled={!name.trim() || !groupName.trim()}
            icon={<ArrowRight className="w-5 h-5" />}
          >
            Get Started
          </Button>
        </form>
      </div>
    </div>
  );
};