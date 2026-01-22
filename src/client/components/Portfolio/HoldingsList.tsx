import { useState, useMemo } from 'react';
import { HoldingWithQuote } from '../../lib/api';
import HoldingRow from './HoldingRow';

interface HoldingsListProps {
  holdings: HoldingWithQuote[];
  accountId: number;
  onUpdate: () => void;
}

type SortColumn = 'symbol' | 'shares' | 'avgCost' | 'currentPrice' | 'marketValue' | 'gain' | 'dayChange';
type SortDirection = 'asc' | 'desc';

export default function HoldingsList({ holdings, accountId, onUpdate }: HoldingsListProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('symbol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortColumn) {
        case 'symbol':
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        case 'shares':
          aVal = a.shares;
          bVal = b.shares;
          break;
        case 'avgCost':
          aVal = a.avgCost;
          bVal = b.avgCost;
          break;
        case 'currentPrice':
          aVal = a.currentPrice;
          bVal = b.currentPrice;
          break;
        case 'marketValue':
          aVal = a.marketValue;
          bVal = b.marketValue;
          break;
        case 'gain':
          aVal = a.gain;
          bVal = b.gain;
          break;
        case 'dayChange':
          aVal = a.dayChange;
          bVal = b.dayChange;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [holdings, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <span className="ml-1 text-gray-300">&#8597;</span>;
    }
    return sortDirection === 'asc'
      ? <span className="ml-1">&#9650;</span>
      : <span className="ml-1">&#9660;</span>;
  };

  const headerClass = "px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none";

  if (holdings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        No holdings yet. Add your first stock to get started.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className={`${headerClass} text-left`}
                onClick={() => handleSort('symbol')}
              >
                Symbol<SortIcon column="symbol" />
              </th>
              <th
                className={`${headerClass} text-right`}
                onClick={() => handleSort('shares')}
              >
                Shares<SortIcon column="shares" />
              </th>
              <th
                className={`${headerClass} text-right`}
                onClick={() => handleSort('avgCost')}
              >
                Avg Cost<SortIcon column="avgCost" />
              </th>
              <th
                className={`${headerClass} text-right`}
                onClick={() => handleSort('currentPrice')}
              >
                Price<SortIcon column="currentPrice" />
              </th>
              <th
                className={`${headerClass} text-right`}
                onClick={() => handleSort('marketValue')}
              >
                Market Value<SortIcon column="marketValue" />
              </th>
              <th
                className={`${headerClass} text-right`}
                onClick={() => handleSort('gain')}
              >
                Gain/Loss<SortIcon column="gain" />
              </th>
              <th
                className={`${headerClass} text-right`}
                onClick={() => handleSort('dayChange')}
              >
                Day Change<SortIcon column="dayChange" />
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedHoldings.map((holding) => (
              <HoldingRow key={holding.id} holding={holding} accountId={accountId} onUpdate={onUpdate} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
