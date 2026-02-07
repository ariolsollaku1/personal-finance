import { RecurringTransaction, AccountTransaction, Currency } from '../../lib/api';
import { AccountModals } from '../../hooks/useAccountPage';
import { RecurringList, TransactionList } from './index';

interface BankAccountContentProps {
  currency: Currency;
  transactions: AccountTransaction[] | null;
  recurring: RecurringTransaction[] | null;
  modals: AccountModals;
  onApplyRecurring: (id: number) => void;
  onDeleteRecurring: (id: number) => void;
  onDeleteTransaction: (id: number) => void;
}

export default function BankAccountContent({
  currency,
  transactions,
  recurring,
  modals,
  onApplyRecurring,
  onDeleteRecurring,
  onDeleteTransaction,
}: BankAccountContentProps) {
  return (
    <>
      <RecurringList
        recurring={recurring || []}
        currency={currency}
        onApply={onApplyRecurring}
        onEdit={modals.setEditingRecurring}
        onDelete={onDeleteRecurring}
        onAdd={() => modals.setShowAddRecurring(true)}
      />
      <TransactionList
        transactions={transactions || []}
        currency={currency}
        isStockAccount={false}
        onEdit={modals.setEditingTransaction}
        onDelete={onDeleteTransaction}
        onAdd={() => modals.setShowTransactionModal(true)}
      />
    </>
  );
}
