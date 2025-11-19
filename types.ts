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

export interface User {
  id: string;
  name: string;
  email?: string; // Added for future use
  avatarUrl?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  payerId: string;
  date: string;
  category: Category;
  items?: string[];
  involvedUserIds: string[]; // IDs of users sharing this expense
  isRecurring: boolean;
  type?: ExpenseType; // BILL or SETTLEMENT
  splitType?: SplitType;
  splitDetails?: { [userId: string]: number }; // Optional: Map userId to specific amount
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