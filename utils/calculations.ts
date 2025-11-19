import { Expense, User, Transaction, Category } from '../types';

export const calculateSettlements = (expenses: Expense[], users: User[]): Transaction[] => {
  const balances: { [userId: string]: number } = {};
  
  // Initialize balances
  users.forEach(user => {
    balances[user.id] = 0;
  });

  // Calculate net balance for each user
  expenses.forEach(expense => {
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

    const amount = Math.min(Math.abs(debtor.amount), creditor.amount);
    const settleAmount = Math.round(amount * 100) / 100;

    if (settleAmount > 0) {
        settlements.push({
            fromUserId: debtor.id,
            toUserId: creditor.id,
            amount: settleAmount,
        });
    }

    debtor.amount += settleAmount;
    creditor.amount -= settleAmount;

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
  const headers = ['Date', 'Type', 'Description', 'Category', 'Payer', 'Amount', 'Split Type', 'Split Details', 'Recurring'];
  const rows = expenses.map(e => {
    const payerName = users.find(u => u.id === e.payerId)?.name || 'Unknown';
    
    let splitInfo = '';
    if (e.splitType === 'CUSTOM' && e.splitDetails) {
        splitInfo = Object.entries(e.splitDetails)
            .map(([uid, amt]) => `${users.find(u => u.id === uid)?.name}: ${amt}`)
            .join('; ');
    } else {
        splitInfo = e.involvedUserIds.map(id => users.find(u => u.id === id)?.name).join(' & ');
    }

    const type = e.type === 'SETTLEMENT' ? 'Settlement' : 'Bill';
    
    return [
      e.date,
      type,
      `"${e.description}"`,
      e.category,
      payerName,
      e.amount.toFixed(2),
      e.splitType || 'EQUAL',
      `"${splitInfo}"`,
      e.isRecurring ? 'Yes' : 'No'
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

export const generateWhatsAppLink = (expense: Expense, currency: string) => {
    const symbol = currency === 'INR' ? '₹' : currency;
    const text = `New expense on ShareMates: '${expense.description}' for ${symbol}${expense.amount}. Added by me.`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
};