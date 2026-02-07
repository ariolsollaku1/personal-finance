import { useState } from 'react';
import { HoldingWithQuote, holdingsApi, Currency } from '../../lib/api';
import type { StockTransaction } from '../../../shared/types';
import { formatCurrency } from '../../lib/currency';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';
import ConfirmModal from '../ConfirmModal';
import SwipeableRow from '../SwipeableRow';
import ActionDropdown from '../ActionDropdown';

interface HoldingRowProps {
  holding: HoldingWithQuote;
  accountId: number;
  currency: Currency;
  onUpdate: () => void;
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatShares(value: number | string): string {
  const n = Number(value);
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface EditingTx {
  id: number;
  shares: string;
  price: string;
  fees: string;
}

function TransactionRow({
  tx,
  currency,
  onEdit,
  onDelete,
}: {
  tx: StockTransaction;
  currency: Currency;
  onEdit: (tx: StockTransaction) => void;
  onDelete: (tx: StockTransaction) => void;
}) {
  const shares = Number(tx.shares);
  const price = Number(tx.price);
  const fees = Number(tx.fees);
  const total = tx.type === 'buy'
    ? shares * price + fees
    : shares * price - fees;

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-100/50">
      <td className="px-6 py-2 text-sm text-gray-700">
        {new Date(tx.date).toLocaleDateString()}
      </td>
      <td className="px-4 py-2">
        <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
          tx.type === 'buy'
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        }`}>
          {tx.type.toUpperCase()}
        </span>
      </td>
      <td className="px-4 py-2 text-sm text-right text-gray-700">
        {formatShares(tx.shares)}
      </td>
      <td className="px-4 py-2 text-sm text-right text-gray-700">
        {formatCurrency(tx.price, currency)}
      </td>
      <td className="px-4 py-2 text-sm text-right text-gray-500">
        {tx.fees > 0 ? formatCurrency(tx.fees, currency) : '-'}
      </td>
      <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
        {formatCurrency(total, currency)}
      </td>
      <td className="px-4 py-2 text-right text-sm whitespace-nowrap space-x-2">
        <button onClick={() => onEdit(tx)} className="text-orange-600 hover:text-orange-800">
          Edit
        </button>
        <button onClick={() => onDelete(tx)} className="text-red-600 hover:text-red-800">
          Delete
        </button>
      </td>
    </tr>
  );
}

function EditTransactionRow({
  editing,
  txType,
  currency,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  editing: EditingTx;
  txType: 'buy' | 'sell';
  currency: Currency;
  onChange: (field: keyof EditingTx, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const shares = parseFloat(editing.shares) || 0;
  const price = parseFloat(editing.price) || 0;
  const fees = parseFloat(editing.fees) || 0;
  const total = txType === 'buy' ? shares * price + fees : shares * price - fees;

  return (
    <tr className="border-t border-gray-100 bg-orange-50/50">
      <td className="px-6 py-2 text-sm text-gray-400">-</td>
      <td className="px-4 py-2">
        <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
          txType === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {txType.toUpperCase()}
        </span>
      </td>
      <td className="px-4 py-1 text-right">
        <input
          type="number"
          step="any"
          min="0"
          value={editing.shares}
          onChange={(e) => onChange('shares', e.target.value)}
          className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </td>
      <td className="px-4 py-1 text-right">
        <input
          type="number"
          step="any"
          min="0"
          value={editing.price}
          onChange={(e) => onChange('price', e.target.value)}
          className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </td>
      <td className="px-4 py-1 text-right">
        <input
          type="number"
          step="any"
          min="0"
          value={editing.fees}
          onChange={(e) => onChange('fees', e.target.value)}
          className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </td>
      <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
        {formatCurrency(total, currency)}
      </td>
      <td className="px-4 py-2 text-right text-sm whitespace-nowrap space-x-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="text-green-600 hover:text-green-800 disabled:opacity-50 font-medium"
        >
          {saving ? '...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          Cancel
        </button>
      </td>
    </tr>
  );
}

interface NewTxForm {
  type: 'buy' | 'sell';
  shares: string;
  price: string;
  fees: string;
  date: string;
}

const emptyNewTx = (): NewTxForm => ({
  type: 'buy',
  shares: '',
  price: '',
  fees: '',
  date: new Date().toISOString().split('T')[0],
});

export default function HoldingRow({ holding, accountId, currency, onUpdate }: HoldingRowProps) {
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [editing, setEditing] = useState<EditingTx | null>(null);
  const [editingType, setEditingType] = useState<'buy' | 'sell'>('buy');
  const [saving, setSaving] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [newTx, setNewTx] = useState<NewTxForm>(emptyNewTx);
  const [addingTx, setAddingTx] = useState(false);
  const toast = useToast();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const isClosed = holding.shares <= 0;

  const loadTransactions = async () => {
    setLoadingTx(true);
    try {
      const txs = await holdingsApi.getTransactions(holding.symbol, accountId);
      setTransactions(txs);
    } catch (error) {
      toast.error('Holdings', 'Failed to load transaction history');
    } finally {
      setLoadingTx(false);
    }
  };

  const handleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      setEditing(null);
      return;
    }
    setExpanded(true);
    if (transactions.length === 0) {
      await loadTransactions();
    }
  };

  const handleDelete = async () => {
    if (!await confirm({ title: 'Delete Holding', message: `Are you sure you want to delete ${holding.symbol}?`, confirmLabel: 'Delete', variant: 'danger' })) {
      return;
    }

    setDeleting(true);
    try {
      await holdingsApi.delete(holding.id);
      onUpdate();
    } catch (error) {
      toast.error('Holdings', error instanceof Error ? error.message : 'Failed to delete holding');
    } finally {
      setDeleting(false);
    }
  };

  const handleEditTx = (tx: StockTransaction) => {
    setEditing({
      id: tx.id,
      shares: String(Number(tx.shares)),
      price: String(Number(tx.price)),
      fees: String(Number(tx.fees)),
    });
    setEditingType(tx.type);
  };

  const handleEditChange = (field: keyof EditingTx, value: string) => {
    if (!editing) return;
    setEditing({ ...editing, [field]: value });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const shares = parseFloat(editing.shares);
    const price = parseFloat(editing.price);
    const fees = parseFloat(editing.fees);

    if (!shares || shares <= 0 || !price || price <= 0) {
      toast.error('Holdings', 'Shares and price must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      await holdingsApi.updateTransaction(holding.symbol, editing.id, {
        shares,
        price,
        fees: fees || 0,
      });
      setEditing(null);
      await loadTransactions();
    } catch (error) {
      toast.error('Holdings', error instanceof Error ? error.message : 'Failed to update transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTx = async () => {
    const shares = parseFloat(newTx.shares);
    const price = parseFloat(newTx.price);
    const fees = parseFloat(newTx.fees) || 0;

    if (!shares || shares <= 0 || !price || price <= 0) {
      toast.error('Holdings', 'Shares and price must be greater than 0');
      return;
    }

    setAddingTx(true);
    try {
      if (newTx.type === 'buy') {
        await holdingsApi.create({
          symbol: holding.symbol,
          shares,
          price,
          fees,
          date: newTx.date,
          accountId,
        });
      } else {
        await holdingsApi.sell(holding.symbol, {
          shares,
          price,
          fees,
          date: newTx.date,
          accountId,
        });
      }
      setShowAddTx(false);
      setNewTx(emptyNewTx());
      await loadTransactions();
    } catch (error) {
      toast.error('Holdings', error instanceof Error ? error.message : 'Failed to add transaction');
    } finally {
      setAddingTx(false);
    }
  };

  const handleDeleteTx = async (tx: StockTransaction) => {
    if (!await confirm({
      title: 'Delete Transaction',
      message: `Delete this ${tx.type} of ${Number(tx.shares)} shares @ ${formatCurrency(Number(tx.price), currency)}?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })) {
      return;
    }

    try {
      await holdingsApi.deleteTransaction(holding.symbol, tx.id);
      await loadTransactions();
    } catch (error) {
      toast.error('Holdings', error instanceof Error ? error.message : 'Failed to delete transaction');
    }
  };

  return (
    <>
      <tr className={`hover:bg-gray-50 ${isClosed ? 'opacity-50' : ''}`}>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExpand}
              className="text-gray-400 hover:text-gray-600 transition-transform duration-200 flex-shrink-0"
              style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{holding.symbol}</span>
                {isClosed && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 text-gray-500">
                    Closed
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500">{holding.name}</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
          {formatShares(holding.shares)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
          {formatCurrency(holding.avgCost, currency)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
          {isClosed ? '-' : formatCurrency(holding.currentPrice, currency)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
          {isClosed ? '-' : formatCurrency(holding.marketValue, currency)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
          {isClosed ? (
            holding.realizedGain !== undefined ? (
              <div className={holding.realizedGain >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(holding.realizedGain, currency)}
              </div>
            ) : (
              <span className="text-gray-400">-</span>
            )
          ) : (
            <>
              <div className={holding.gain >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(holding.gain, currency)}
              </div>
              <div className={`text-xs ${holding.gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(holding.gainPercent)}
              </div>
            </>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
          {isClosed ? (
            <span className="text-gray-400">-</span>
          ) : (
            <>
              <div className={holding.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(holding.dayChange, currency)}
              </div>
              <div className={`text-xs ${holding.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(holding.dayChangePercent)}
              </div>
            </>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            {deleting ? '...' : 'Delete'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="px-0 py-0">
            <div className="bg-gray-50 border-t border-b border-gray-100">
              {loadingTx ? (
                <div className="px-6 py-4 text-sm text-gray-500 flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading transactions...
                </div>
              ) : transactions.length === 0 ? (
                <div className="px-6 py-4 text-sm text-gray-400">
                  No transaction history found.
                </div>
              ) : (
                <table className="min-w-full">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase">
                      <th className="px-6 py-2 text-left font-medium">Date</th>
                      <th className="px-4 py-2 text-left font-medium">Type</th>
                      <th className="px-4 py-2 text-right font-medium">Shares</th>
                      <th className="px-4 py-2 text-right font-medium">Price</th>
                      <th className="px-4 py-2 text-right font-medium">Fees</th>
                      <th className="px-4 py-2 text-right font-medium">Total</th>
                      <th className="px-4 py-2 text-right font-medium w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) =>
                      editing && editing.id === tx.id ? (
                        <EditTransactionRow
                          key={tx.id}
                          editing={editing}
                          txType={editingType}
                          currency={currency}
                          onChange={handleEditChange}
                          onSave={handleSaveEdit}
                          onCancel={() => setEditing(null)}
                          saving={saving}
                        />
                      ) : (
                        <TransactionRow
                          key={tx.id}
                          tx={tx}
                          currency={currency}
                          onEdit={handleEditTx}
                          onDelete={handleDeleteTx}
                        />
                      )
                    )}
                  </tbody>
                </table>
              )}
              {/* Add Transaction */}
              {showAddTx ? (
                <div className="px-6 py-3 border-t border-gray-200">
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                      <div className="flex rounded-lg overflow-hidden border border-gray-300">
                        <button
                          type="button"
                          onClick={() => setNewTx({ ...newTx, type: 'buy' })}
                          className={`px-3 py-1.5 text-xs font-semibold ${
                            newTx.type === 'buy'
                              ? 'bg-green-500 text-white'
                              : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Buy
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewTx({ ...newTx, type: 'sell' })}
                          className={`px-3 py-1.5 text-xs font-semibold border-l border-gray-300 ${
                            newTx.type === 'sell'
                              ? 'bg-red-500 text-white'
                              : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Sell
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Shares</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={newTx.shares}
                        onChange={(e) => setNewTx({ ...newTx, shares: e.target.value })}
                        placeholder="0"
                        className="w-24 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Price</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={newTx.price}
                        onChange={(e) => setNewTx({ ...newTx, price: e.target.value })}
                        placeholder="0.00"
                        className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Fees</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={newTx.fees}
                        onChange={(e) => setNewTx({ ...newTx, fees: e.target.value })}
                        placeholder="0"
                        className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                      <input
                        type="date"
                        value={newTx.date}
                        onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                        className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddTx}
                        disabled={addingTx || !newTx.shares || !newTx.price}
                        className="px-3 py-1.5 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                      >
                        {addingTx ? '...' : 'Add'}
                      </button>
                      <button
                        onClick={() => { setShowAddTx(false); setNewTx(emptyNewTx()); }}
                        disabled={addingTx}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-2 border-t border-gray-200">
                  <button
                    onClick={() => setShowAddTx(true)}
                    className="text-sm text-orange-600 hover:text-orange-800 font-medium"
                  >
                    + Add Transaction
                  </button>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}

function MobileTransactionRow({
  tx,
  currency,
  onEdit,
  onDelete,
}: {
  tx: StockTransaction;
  currency: Currency;
  onEdit: (tx: StockTransaction) => void;
  onDelete: (tx: StockTransaction) => void;
}) {
  const shares = Number(tx.shares);
  const price = Number(tx.price);
  const fees = Number(tx.fees);
  const total = tx.type === 'buy' ? shares * price + fees : shares * price - fees;

  return (
    <SwipeableRow
      actions={[
        { label: 'Edit', onClick: () => onEdit(tx), color: 'bg-blue-500' },
        { label: 'Delete', onClick: () => onDelete(tx), color: 'bg-red-500' },
      ]}
    >
      <div className="py-2.5 px-4 flex justify-between items-center">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-xs text-gray-500 w-16 flex-shrink-0">
            {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
          </div>
          <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0 ${
            tx.type === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {tx.type.toUpperCase()}
          </span>
          <div className="text-sm text-gray-700">
            {formatShares(tx.shares)} @ {formatCurrency(price, currency)}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-sm font-medium text-gray-900">{formatCurrency(total, currency)}</span>
          <ActionDropdown
            actions={[
              { label: 'Edit', onClick: () => onEdit(tx) },
              { label: 'Delete', onClick: () => onDelete(tx), variant: 'danger' },
            ]}
          />
        </div>
      </div>
    </SwipeableRow>
  );
}

function MobileEditTransaction({
  editing,
  txType,
  currency,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  editing: EditingTx;
  txType: 'buy' | 'sell';
  currency: Currency;
  onChange: (field: keyof EditingTx, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const shares = parseFloat(editing.shares) || 0;
  const price = parseFloat(editing.price) || 0;
  const fees = parseFloat(editing.fees) || 0;
  const total = txType === 'buy' ? shares * price + fees : shares * price - fees;

  return (
    <div className="py-2.5 px-4 bg-orange-50/50 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
          txType === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {txType.toUpperCase()}
        </span>
        <span className="text-sm text-gray-500">Total: {formatCurrency(total, currency)}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Shares</label>
          <input
            type="number"
            step="any"
            min="0"
            value={editing.shares}
            onChange={(e) => onChange('shares', e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Price</label>
          <input
            type="number"
            step="any"
            min="0"
            value={editing.price}
            onChange={(e) => onChange('price', e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Fees</label>
          <input
            type="number"
            step="any"
            min="0"
            value={editing.fees}
            onChange={(e) => onChange('fees', e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-3 py-1.5 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {saving ? '...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function MobileAddTransaction({
  newTx,
  setNewTx,
  onAdd,
  onCancel,
  adding,
}: {
  newTx: NewTxForm;
  setNewTx: (tx: NewTxForm) => void;
  onAdd: () => void;
  onCancel: () => void;
  adding: boolean;
}) {
  return (
    <div className="px-4 py-3 border-t border-gray-200">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              <button
                type="button"
                onClick={() => setNewTx({ ...newTx, type: 'buy' })}
                className={`px-3 py-1.5 text-xs font-semibold ${
                  newTx.type === 'buy'
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setNewTx({ ...newTx, type: 'sell' })}
                className={`px-3 py-1.5 text-xs font-semibold border-l border-gray-300 ${
                  newTx.type === 'sell'
                    ? 'bg-red-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Sell
              </button>
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <input
              type="date"
              value={newTx.date}
              onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Shares</label>
            <input
              type="number"
              step="any"
              min="0"
              value={newTx.shares}
              onChange={(e) => setNewTx({ ...newTx, shares: e.target.value })}
              placeholder="0"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Price</label>
            <input
              type="number"
              step="any"
              min="0"
              value={newTx.price}
              onChange={(e) => setNewTx({ ...newTx, price: e.target.value })}
              placeholder="0.00"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fees</label>
            <input
              type="number"
              step="any"
              min="0"
              value={newTx.fees}
              onChange={(e) => setNewTx({ ...newTx, fees: e.target.value })}
              placeholder="0"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onAdd}
            disabled={adding || !newTx.shares || !newTx.price}
            className="px-3 py-1.5 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {adding ? '...' : 'Add'}
          </button>
          <button
            onClick={onCancel}
            disabled={adding}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function MobileHoldingCard({ holding, accountId, currency, onUpdate }: HoldingRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [editing, setEditing] = useState<EditingTx | null>(null);
  const [editingType, setEditingType] = useState<'buy' | 'sell'>('buy');
  const [saving, setSaving] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [newTx, setNewTx] = useState<NewTxForm>(emptyNewTx);
  const [addingTx, setAddingTx] = useState(false);
  const toast = useToast();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const isClosed = holding.shares <= 0;

  const loadTransactions = async () => {
    setLoadingTx(true);
    try {
      const txs = await holdingsApi.getTransactions(holding.symbol, accountId);
      setTransactions(txs);
    } catch (error) {
      toast.error('Holdings', 'Failed to load transaction history');
    } finally {
      setLoadingTx(false);
    }
  };

  const handleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      setEditing(null);
      return;
    }
    setExpanded(true);
    if (transactions.length === 0) {
      await loadTransactions();
    }
  };

  const handleDelete = async () => {
    if (!await confirm({ title: 'Delete Holding', message: `Are you sure you want to delete ${holding.symbol}?`, confirmLabel: 'Delete', variant: 'danger' })) {
      return;
    }
    try {
      await holdingsApi.delete(holding.id);
      onUpdate();
    } catch (error) {
      toast.error('Holdings', error instanceof Error ? error.message : 'Failed to delete holding');
    }
  };

  const handleEditTx = (tx: StockTransaction) => {
    setEditing({
      id: tx.id,
      shares: String(Number(tx.shares)),
      price: String(Number(tx.price)),
      fees: String(Number(tx.fees)),
    });
    setEditingType(tx.type);
  };

  const handleEditChange = (field: keyof EditingTx, value: string) => {
    if (!editing) return;
    setEditing({ ...editing, [field]: value });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const shares = parseFloat(editing.shares);
    const price = parseFloat(editing.price);
    const fees = parseFloat(editing.fees);

    if (!shares || shares <= 0 || !price || price <= 0) {
      toast.error('Holdings', 'Shares and price must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      await holdingsApi.updateTransaction(holding.symbol, editing.id, {
        shares,
        price,
        fees: fees || 0,
      });
      setEditing(null);
      await loadTransactions();
    } catch (error) {
      toast.error('Holdings', error instanceof Error ? error.message : 'Failed to update transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTx = async () => {
    const shares = parseFloat(newTx.shares);
    const price = parseFloat(newTx.price);
    const fees = parseFloat(newTx.fees) || 0;

    if (!shares || shares <= 0 || !price || price <= 0) {
      toast.error('Holdings', 'Shares and price must be greater than 0');
      return;
    }

    setAddingTx(true);
    try {
      if (newTx.type === 'buy') {
        await holdingsApi.create({
          symbol: holding.symbol,
          shares,
          price,
          fees,
          date: newTx.date,
          accountId,
        });
      } else {
        await holdingsApi.sell(holding.symbol, {
          shares,
          price,
          fees,
          date: newTx.date,
          accountId,
        });
      }
      setShowAddTx(false);
      setNewTx(emptyNewTx());
      await loadTransactions();
    } catch (error) {
      toast.error('Holdings', error instanceof Error ? error.message : 'Failed to add transaction');
    } finally {
      setAddingTx(false);
    }
  };

  const handleDeleteTx = async (tx: StockTransaction) => {
    if (!await confirm({
      title: 'Delete Transaction',
      message: `Delete this ${tx.type} of ${Number(tx.shares)} shares @ ${formatCurrency(Number(tx.price), currency)}?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })) {
      return;
    }

    try {
      await holdingsApi.deleteTransaction(holding.symbol, tx.id);
      await loadTransactions();
    } catch (error) {
      toast.error('Holdings', error instanceof Error ? error.message : 'Failed to delete transaction');
    }
  };

  return (
    <>
      <SwipeableRow
        actions={[
          { label: 'Delete', onClick: handleDelete, color: 'bg-red-500' },
        ]}
      >
        <div
          className={`py-3 px-4 flex justify-between items-center ${isClosed ? 'opacity-50' : ''}`}
          onClick={handleExpand}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button
              className="text-gray-400 transition-transform duration-200 flex-shrink-0"
              style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{holding.symbol}</span>
                {isClosed && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 text-gray-500">
                    Closed
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {formatShares(holding.shares)} shares @ {formatCurrency(holding.avgCost, currency)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="text-right">
              {isClosed ? (
                holding.realizedGain !== undefined ? (
                  <div className={`text-sm font-medium ${holding.realizedGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(holding.realizedGain, currency)}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">-</div>
                )
              ) : (
                <>
                  <div className="text-sm font-medium text-gray-900">{formatCurrency(holding.marketValue, currency)}</div>
                  <div className={`text-xs ${holding.gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(holding.gain, currency)} ({formatPercent(holding.gainPercent)})
                  </div>
                </>
              )}
            </div>
            <ActionDropdown
              actions={[
                { label: 'Delete', onClick: handleDelete, variant: 'danger' },
              ]}
            />
          </div>
        </div>
      </SwipeableRow>

      {expanded && (
        <div className="bg-gray-50 border-t border-gray-100">
          {loadingTx ? (
            <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">
              No transaction history found.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.map((tx) =>
                editing && editing.id === tx.id ? (
                  <MobileEditTransaction
                    key={tx.id}
                    editing={editing}
                    txType={editingType}
                    currency={currency}
                    onChange={handleEditChange}
                    onSave={handleSaveEdit}
                    onCancel={() => setEditing(null)}
                    saving={saving}
                  />
                ) : (
                  <MobileTransactionRow
                    key={tx.id}
                    tx={tx}
                    currency={currency}
                    onEdit={handleEditTx}
                    onDelete={handleDeleteTx}
                  />
                )
              )}
            </div>
          )}
          {showAddTx ? (
            <MobileAddTransaction
              newTx={newTx}
              setNewTx={setNewTx}
              onAdd={handleAddTx}
              onCancel={() => { setShowAddTx(false); setNewTx(emptyNewTx()); }}
              adding={addingTx}
            />
          ) : (
            <div className="px-4 py-2 border-t border-gray-200">
              <button
                onClick={() => setShowAddTx(true)}
                className="text-sm text-orange-600 hover:text-orange-800 font-medium"
              >
                + Add Transaction
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
