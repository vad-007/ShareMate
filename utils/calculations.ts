import { Expense, User, Transaction, Category } from '../types';

export const calculateBalances = (expenses: Expense[], users: User[]): { [userId: string]: number } => {
  const balances: { [userId: string]: number } = {};
  
  // Initialize balances
  users.forEach(user => {
    balances[user.id] = 0;
  });

  // Calculate net balance for each user
  expenses.forEach(expense => {
    // Skip settlement transactions for balance calculation as they are just moving money
    if (expense.type === 'SETTLEMENT') return;

    const paidBy = expense.payerId;
    const amount = expense.amount;
    
    if (balances[paidBy] !== undefined) {
      balances[paidBy] += amount;
    }

    // Handle splits
    if (expense.splitType === 'CUSTOM' && expense.splitDetails) {
      // Custom split logic
      Object.entries(expense.splitDetails).forEach(([userId, splitAmount]) => {
        if (balances[userId] !== undefined) {
          balances[userId] -= splitAmount;
        }
      });
    } else {
      // Default / Equal split logic
      const validInvolvedUsers = expense.involvedUserIds.filter(id => balances[id] !== undefined);
      
      if (validInvolvedUsers.length > 0) {
        const splitAmount = amount / validInvolvedUsers.length;
        validInvolvedUsers.forEach(userId => {
          balances[userId] -= splitAmount;
        });
      }
    }
  });

  return balances;
};

export interface UserStats {
  paid: number;
  share: number;
  balance: number;
}

export const calculateDetailedStats = (expenses: Expense[], users: User[]): { [userId: string]: UserStats } => {
  const stats: { [userId: string]: UserStats } = {};
  
  // Initialize
  users.forEach(u => {
    stats[u.id] = { paid: 0, share: 0, balance: 0 };
  });

  expenses.forEach(expense => {
     if (expense.type === 'SETTLEMENT') return; // Ignore settlements in spending stats

     const amount = expense.amount;
     
     // 1. Add to Payer's "Paid" total
     if (stats[expense.payerId]) {
         stats[expense.payerId].paid += amount;
     }

     // 2. Add to Involved Users' "Share" total
     if (expense.splitType === 'CUSTOM' && expense.splitDetails) {
         Object.entries(expense.splitDetails).forEach(([uid, shareAmt]) => {
             if (stats[uid]) stats[uid].share += shareAmt;
         });
     } else {
         const validUsers = expense.involvedUserIds.filter(id => stats[id]);
         if (validUsers.length > 0) {
             const splitAmt = amount / validUsers.length;
             validUsers.forEach(uid => {
                 stats[uid].share += splitAmt;
             });
         }
     }
  });

  // 3. Calculate Net Balance (Paid - Share)
  Object.keys(stats).forEach(uid => {
      stats[uid].balance = stats[uid].paid - stats[uid].share;
  });

  return stats;
};

export const calculateSettlements = (expenses: Expense[], users: User[]): Transaction[] => {
  const balances = calculateBalances(expenses, users);

  // Separate into debtors and creditors
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  Object.entries(balances).forEach(([userId, amount]) => {
    const roundedAmount = Math.round(amount * 100) / 100;
    if (roundedAmount < -0.01) {
      debtors.push({ id: userId, amount: roundedAmount }); // amount is negative
    } else if (roundedAmount > 0.01) {
      creditors.push({ id: userId, amount: roundedAmount }); // amount is positive
    }
  });

  debtors.sort((a, b) => a.amount - b.amount); // Ascending (most negative first)
  creditors.sort((a, b) => b.amount - a.amount); // Descending (most positive first)

  const settlements: Transaction[] = [];
  let i = 0; 
  let j = 0; 

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // The amount to settle is the minimum of what the debtor owes and what the creditor is owed
    const amount = Math.min(Math.abs(debtor.amount), creditor.amount);
    const settleAmount = Math.round(amount * 100) / 100;

    if (settleAmount > 0) {
        settlements.push({
            fromUserId: debtor.id,
            toUserId: creditor.id,
            amount: settleAmount,
        });
    }

    // Update internal tracking values
    debtor.amount += settleAmount;
    creditor.amount -= settleAmount;

    // Move indices if settled
    if (Math.abs(debtor.amount) < 0.01) i++;
    if (Math.abs(creditor.amount) < 0.01) j++;
  }

  return settlements;
};

export const formatCurrency = (amount: number, currency: string = 'INR') => {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const generateCSV = (expenses: Expense[], users: User[]) => {
  const headers = [
    'Date', 'Type', 'Description', 'Category', 'Payer', 'Amount', 
    'Split Type', 'Split Details', 'Recurring', 'Created By', 'Confirmations'
  ];
  const rows = expenses.map(e => {
    const payerName = users.find(u => u.id === e.payerId)?.name || 'Unknown';
    const creatorName = users.find(u => u.id === e.audit?.createdBy)?.name || 'System';
    
    let splitInfo = '';
    if (e.splitType === 'CUSTOM' && e.splitDetails) {
        splitInfo = Object.entries(e.splitDetails)
            .map(([uid, amt]) => `${users.find(u => u.id === uid)?.name}: ${amt.toFixed(2)}`)
            .join('; ');
    } else {
        splitInfo = e.involvedUserIds.map(id => users.find(u => u.id === id)?.name).join(' & ');
    }

    const type = e.type === 'SETTLEMENT' ? 'Settlement' : 'Bill';
    
    const confirmations = e.confirmations 
        ? Object.entries(e.confirmations)
            .map(([uid, status]) => `${users.find(u => u.id === uid)?.name?.substring(0,1)}:${status.substring(0,1)}`)
            .join(' ') 
        : 'N/A';

    return [
      e.date,
      type,
      `"${e.description}"`,
      e.category,
      payerName,
      e.amount.toFixed(2),
      e.splitType || 'EQUAL',
      `"${splitInfo}"`,
      e.isRecurring ? 'Yes' : 'No',
      creatorName,
      confirmations
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

export const generateWhatsAppLink = (expense: Expense, currency: string, phoneNumber?: string) => {
    const symbol = currency === 'INR' ? '₹' : currency;
    const text = `Hi, I added "${expense.description}" (${symbol}${expense.amount}) on ShareMates. Your share is calculated in the app.`;
    const encodedText = encodeURIComponent(text);

    if (phoneNumber) {
        // Remove all non-digit characters from phone number
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        return `https://wa.me/${cleanPhone}?text=${encodedText}`;
    }
    // Default share link if no specific number
    return `https://wa.me/?text=${encodedText}`;
};