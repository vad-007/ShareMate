
import React from 'react';
import { X, Shield, Lock, Database, CreditCard, FileText } from 'lucide-react';

interface PrivacyPolicyModalProps {
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-600" />
            Privacy & Security Policy
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-600">
          
          <section>
            <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-brand-500" />
              Data Storage & Ownership
            </h3>
            <p>
              ShareMates functions as a <strong>local-first application</strong>. All your group data, expenses, and settings are stored directly on this device (in LocalStorage). We do not store your personal data on centralized servers. You are the sole owner of your data.
            </p>
          </section>

          <section>
            <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-brand-500" />
              Encryption & Security
            </h3>
            <p>
              While data is stored locally, we rely on your device's security features (screen lock, biometrics) to protect access. When using the app over HTTPS, all transmission of transient data (like receipt analysis) is encrypted using industry-standard TLS.
            </p>
          </section>

          <section>
            <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-brand-500" />
              Payment Credentials
            </h3>
            <p>
              <strong>We do not store banking information.</strong> ShareMates generates payment instructions (e.g., "A pays B ₹500") but does not process payments or store credit card numbers, UPI IDs, or bank account details. All settlements are handled externally by you.
            </p>
          </section>

          <section>
            <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-500" />
              Data Retention & Export
            </h3>
            <p className="mb-2">
              You have full control over your data retention:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Export:</strong> You can download your full expense history as a CSV file at any time from Group Settings.</li>
              <li><strong>Deletion:</strong> You can permanently wipe all data from this device using the "Delete Group" option in Settings.</li>
            </ul>
          </section>

          <div className="bg-brand-50 p-4 rounded-lg border border-brand-100 text-brand-800 text-xs">
            <strong>Note on AI Processing:</strong> Receipt images uploaded for OCR are processed transiently by Google's Gemini API. They are not permanently stored by ShareMates after analysis is complete.
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
