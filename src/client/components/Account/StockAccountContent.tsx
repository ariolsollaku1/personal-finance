import { RecurringTransaction, AccountTransaction, Currency, Category, Payee } from '../../lib/api';
import { PortfolioData, AccountModals, DividendCheckState, NewRecurringFormState } from '../../hooks/useAccountPage';
import AddHoldingModal from '../Portfolio/AddHoldingForm';
import HoldingsList from '../Portfolio/HoldingsList';
import Summary from '../Portfolio/Summary';
import PortfolioPerformanceChart from '../Charts/PortfolioPerformanceChart';
import DividendList from '../Dividends/DividendList';
import TaxSummary from '../Dividends/TaxSummary';
import { RecurringList, TransactionList } from './index';

type StockTab = 'holdings' | 'dividends' | 'transactions';

interface StockAccountContentProps {
  accountId: number;
  currency: Currency;
  portfolio: PortfolioData;
  portfolioRefreshing: boolean;
  refreshPortfolio: () => void;
  lastUpdated: Date | null;
  stockTab: StockTab;
  onTabChange: (tab: StockTab) => void;
  dividends: Array<{ id: number; symbol: string; amount: number; ex_date: string; pay_date: string; net_amount: number; tax_amount: number; tax_rate: number; shares_held: number }> | null;
  taxSummary: { totalGross: number; totalTax: number; totalNet: number; taxRate: number } | null;
  transactions: AccountTransaction[] | null;
  recurring: RecurringTransaction[] | null;
  categories: Category[];
  payees: Payee[];
  modals: AccountModals;
  dividendCheck: DividendCheckState;
  refreshData: () => void;
  onApplyRecurring: (id: number) => void;
  onDeleteRecurring: (id: number) => void;
  onDeleteTransaction: (id: number) => void;
}

export default function StockAccountContent({
  accountId,
  currency,
  portfolio,
  portfolioRefreshing,
  refreshPortfolio,
  lastUpdated,
  stockTab,
  onTabChange,
  dividends,
  taxSummary,
  transactions,
  recurring,
  modals,
  dividendCheck,
  refreshData,
  onApplyRecurring,
  onDeleteRecurring,
  onDeleteTransaction,
}: StockAccountContentProps) {
  return (
    <>
      <Summary
        portfolio={portfolio}
        currency={currency}
        lastUpdated={lastUpdated}
        refreshing={portfolioRefreshing}
        onRefresh={refreshPortfolio}
      />

      <PortfolioPerformanceChart accountId={accountId} currency={currency} />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {(['holdings', 'dividends', 'transactions'] as StockTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`px-6 py-3 text-sm font-medium border-b-2 capitalize ${
                stockTab === tab
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Holdings Tab */}
      {stockTab === 'holdings' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => modals.setShowAddHolding(true)}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-sm shadow-orange-500/25 font-medium transition-all duration-200"
            >
              Add Holding
            </button>
          </div>

          <AddHoldingModal
            isOpen={modals.showAddHolding}
            accountId={accountId}
            onSuccess={() => {
              modals.setShowAddHolding(false);
            }}
            onClose={() => modals.setShowAddHolding(false)}
          />

          <HoldingsList holdings={portfolio.holdings} closedHoldings={portfolio.closedHoldings} accountId={accountId} currency={currency} onUpdate={refreshData} />
        </div>
      )}

      {/* Dividends Tab */}
      {stockTab === 'dividends' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Automatically checks Yahoo Finance for dividends based on your holdings and purchase dates.
            </p>
            <button
              onClick={dividendCheck.handleCheckDividends}
              disabled={dividendCheck.checkingDividends}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {dividendCheck.checkingDividends ? 'Checking...' : 'Check Dividends'}
            </button>
          </div>

          {dividendCheck.dividendCheckResult && (
            <div
              className={`p-4 rounded-md ${
                dividendCheck.dividendCheckResult.includes('Failed')
                  ? 'bg-red-50 text-red-700'
                  : 'bg-green-50 text-green-700'
              }`}
            >
              {dividendCheck.dividendCheckResult}
            </div>
          )}

          <TaxSummary taxSummary={taxSummary} currency={currency} onUpdate={refreshData} />
          <DividendList dividends={dividends || []} currency={currency} onDelete={refreshData} />
        </div>
      )}

      {/* Transactions Tab (for stock accounts) */}
      {stockTab === 'transactions' && (
        <div className="space-y-6">
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
            isStockAccount={true}
            onEdit={modals.setEditingTransaction}
            onDelete={onDeleteTransaction}
            onAdd={() => modals.setShowTransactionModal(true)}
          />
        </div>
      )}
    </>
  );
}
