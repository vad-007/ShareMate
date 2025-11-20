
export enum Category {
  FOOD = 'Food',
  UTILITIES = 'Utilities',
  TRANSPORT = 'Transport',
  ENTERTAINMENT = 'Entertainment',
  HOME = 'Home',
  TRAVEL = 'Travel',
  OTHER = 'Other',
  SETTLEMENT = 'Settlement'
}

export type ExpenseType = 'BILL' | 'SETTLEMENT';
export type SplitType = 'EQUAL' | 'CUSTOM';
export type ConfirmationStatus = 'PENDING' | 'CONFIRMED' | 'FLAGGED';
export type UserRole = 'ADMIN' | 'MEMBER';

export interface Group {
  id: string;
  name: string;
  currency: string;
  timezone?: string;
  createdBy: string;
  createdAt: string;
  notificationPrefs?: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
}

export interface User {
  id: string;
  name: string;
  email?: string; 
  avatarUrl?: string;
  phoneNumber?: string; // Added phone number support
  role?: UserRole;
  isActive?: boolean; // For soft delete
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  payerId: string;
  date: string;
  category: Category;
  items?: string[];
  involvedUserIds: string[]; 
  isRecurring: boolean;
  type?: ExpenseType; 
  splitType?: SplitType;
  splitDetails?: { [userId: string]: number }; 
  receiptImageUrl?: string; // Base64 data for MVP
  
  // Audit & Confirmation Fields
  confirmations?: { [userId: string]: ConfirmationStatus };
  audit?: {
    createdBy: string; 
    createdAt: string; 
    deviceId?: string; 
    voiceNoteAttached?: boolean; 
  };
}

export interface Transaction {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export interface ReceiptData {
  merchant: string;
  date: string;
  total: number;
  category: string;
  items: string[];
}
