import { useState, useEffect, useRef } from 'react';
import { useStockSearch } from '../hooks/useQuotes';

interface StockSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (symbol: string) => void;
}

export default function StockSearch({ value, onChange, onSelect }: StockSearchProps) {
  const { results, loading, search } = useStockSearch();
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (value.length >= 1) {
        search(value);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value, search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setShowResults(true);
        }}
        onFocus={() => setShowResults(true)}
        placeholder="Search symbol..."
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {showResults && (value.length >= 1) && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-4 py-2 text-gray-500">Searching...</div>
          ) : results.length > 0 ? (
            results.map((result) => (
              <button
                key={result.symbol}
                onClick={() => {
                  onSelect(result.symbol);
                  setShowResults(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 flex justify-between items-center"
              >
                <div>
                  <span className="font-medium">{result.symbol}</span>
                  <span className="text-gray-500 text-sm ml-2">{result.shortname}</span>
                </div>
                <span className="text-xs text-gray-400">{result.exchange}</span>
              </button>
            ))
          ) : (
            <div className="px-4 py-2 text-gray-500">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}
