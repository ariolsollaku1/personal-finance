import { useState, useEffect } from 'react';
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react';
import { accountTransactionsApi, categoriesApi, payeesApi, Category, Payee, TransactionType, Currency } from '../lib/api';
import { getCurrencySymbol } from '../lib/currency';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: number;
  accountCurrency: Currency;
  isStockAccount?: boolean;
  onSuccess: () => void;
}

export default function AddTransactionModal({
  isOpen,
  onClose,
  accountId,
  accountCurrency,
  isStockAccount = false,
  onSuccess,
}: AddTransactionModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: 'outflow' as TransactionType,
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payee: '',
    category: '',
    notes: '',
  });

  const [payeeQuery, setPayeeQuery] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [categoriesData, payeesData] = await Promise.all([
        categoriesApi.getAll(),
        payeesApi.getAll(),
      ]);
      setCategories(categoriesData);
      setPayees(payeesData);
    } catch (err) {
      console.error('Failed to load categories/payees:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await accountTransactionsApi.create(accountId, {
        type: formData.type,
        amount: parseFloat(formData.amount),
        date: formData.date,
        payee: formData.payee || undefined,
        category: formData.category || undefined,
        notes: formData.notes || undefined,
      });

      // Reset form
      setFormData({
        type: 'outflow',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        payee: '',
        category: '',
        notes: '',
      });
      setPayeeQuery('');
      setCategoryQuery('');

      onSuccess();
      onClose();
      window.dispatchEvent(new Event('accounts-changed'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setError(null);
      setFormData({
        type: 'outflow',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        payee: '',
        category: '',
        notes: '',
      });
      setPayeeQuery('');
      setCategoryQuery('');
      onClose();
    }
  };

  // Create a new payee
  const handleCreatePayee = async (name: string) => {
    try {
      const newPayee = await payeesApi.create({ name });
      setPayees([...payees, newPayee]);
      setFormData({ ...formData, payee: newPayee.name });
      setPayeeQuery(newPayee.name);
    } catch (err) {
      console.error('Failed to create payee:', err);
    }
  };

  // Create a new category
  const handleCreateCategory = async (name: string) => {
    try {
      const categoryType = formData.type === 'inflow' ? 'income' : 'expense';
      const newCategory = await categoriesApi.create({ name, type: categoryType });
      setCategories([...categories, newCategory]);
      setFormData({ ...formData, category: newCategory.name });
      setCategoryQuery(newCategory.name);
    } catch (err) {
      console.error('Failed to create category:', err);
    }
  };

  if (!isOpen) return null;

  const currencySymbol = getCurrencySymbol(accountCurrency);

  // Filter payees based on query
  const filteredPayees = payeeQuery === ''
    ? payees
    : payees.filter((p) => p.name.toLowerCase().includes(payeeQuery.toLowerCase()));

  // Check if payee query matches an existing payee exactly
  const payeeExists = payees.some((p) => p.name.toLowerCase() === payeeQuery.toLowerCase());

  // Filter categories based on query and transaction type
  const filteredCategories = categories
    .filter((c) => formData.type === 'inflow' ? c.type === 'income' : c.type === 'expense')
    .filter((c) => categoryQuery === '' || c.name.toLowerCase().includes(categoryQuery.toLowerCase()));

  // Check if category query matches an existing category exactly (of the right type)
  const categoryExists = categories
    .filter((c) => formData.type === 'inflow' ? c.type === 'income' : c.type === 'expense')
    .some((c) => c.name.toLowerCase() === categoryQuery.toLowerCase());

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end lg:items-center lg:justify-center z-50 lg:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="bg-white rounded-t-2xl lg:rounded-2xl shadow-2xl w-full lg:max-w-md max-h-[90vh] overflow-hidden animate-slide-up lg:animate-none"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle - mobile only */}
        <div className="flex justify-center pt-3 pb-2 lg:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 lg:border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add Transaction</h2>
            <p className="text-sm text-gray-500 mt-0.5">Record a new transaction</p>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Type Selection */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setFormData({ ...formData, type: 'inflow', category: '' });
                setCategoryQuery('');
              }}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                formData.type === 'inflow'
                  ? 'bg-green-100 text-green-700 ring-2 ring-green-500/20'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
                {isStockAccount ? 'Deposit' : 'Income'}
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData({ ...formData, type: 'outflow', category: '' });
                setCategoryQuery('');
              }}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                formData.type === 'outflow'
                  ? 'bg-red-100 text-red-700 ring-2 ring-red-500/20'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
                {isStockAccount ? 'Withdrawal' : 'Expense'}
              </div>
            </button>
          </div>

          {/* Amount and Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  placeholder="0.00"
                  required
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>
          </div>

          {/* Payee and Category (only for non-stock accounts) */}
          {!isStockAccount && (
            <div className="grid grid-cols-2 gap-4">
              {/* Payee Combobox */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Payee</label>
                <Combobox
                  value={formData.payee}
                  onChange={(value) => {
                    if (value === '__create_new__') {
                      handleCreatePayee(payeeQuery);
                    } else {
                      setFormData({ ...formData, payee: value || '' });
                      setPayeeQuery(value || '');
                    }
                  }}
                >
                  <div className="relative">
                    <ComboboxInput
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter payee"
                      displayValue={(value: string) => value}
                      onChange={(e) => {
                        setPayeeQuery(e.target.value);
                        setFormData({ ...formData, payee: e.target.value });
                      }}
                    />
                    <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </ComboboxButton>
                    <ComboboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
                      {payeeQuery !== '' && !payeeExists && (
                        <ComboboxOption
                          value="__create_new__"
                          className="relative cursor-pointer select-none py-2 px-4 text-orange-600 data-[focus]:bg-orange-50 font-medium"
                        >
                          + Add "{payeeQuery}"
                        </ComboboxOption>
                      )}
                      {filteredPayees.map((payee) => (
                        <ComboboxOption
                          key={payee.id}
                          value={payee.name}
                          className="relative cursor-pointer select-none py-2 px-4 text-gray-900 data-[focus]:bg-orange-50 data-[focus]:text-orange-900"
                        >
                          {payee.name}
                        </ComboboxOption>
                      ))}
                    </ComboboxOptions>
                  </div>
                </Combobox>
              </div>

              {/* Category Combobox */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                <Combobox
                  value={formData.category}
                  onChange={(value) => {
                    if (value === '__create_new__') {
                      handleCreateCategory(categoryQuery);
                    } else {
                      setFormData({ ...formData, category: value || '' });
                      setCategoryQuery(value || '');
                    }
                  }}
                >
                  <div className="relative">
                    <ComboboxInput
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter category"
                      displayValue={(value: string) => value}
                      onChange={(e) => {
                        setCategoryQuery(e.target.value);
                        setFormData({ ...formData, category: e.target.value });
                      }}
                    />
                    <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </ComboboxButton>
                    <ComboboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
                      {categoryQuery !== '' && !categoryExists && (
                        <ComboboxOption
                          value="__create_new__"
                          className="relative cursor-pointer select-none py-2 px-4 text-orange-600 data-[focus]:bg-orange-50 font-medium"
                        >
                          + Add "{categoryQuery}"
                        </ComboboxOption>
                      )}
                      {filteredCategories.map((category) => (
                        <ComboboxOption
                          key={category.id}
                          value={category.name}
                          className="relative cursor-pointer select-none py-2 px-4 text-gray-900 data-[focus]:bg-orange-50 data-[focus]:text-orange-900"
                        >
                          {category.name}
                        </ComboboxOption>
                      ))}
                    </ComboboxOptions>
                  </div>
                </Combobox>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              placeholder={isStockAccount ? "e.g., Deposit for stock purchase" : "Optional notes"}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse lg:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="w-full lg:flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.amount}
              className="w-full lg:flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 flex items-center justify-center gap-2"
            >
              {submitting && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {submitting ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
