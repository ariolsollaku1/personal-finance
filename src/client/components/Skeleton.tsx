// Reusable skeleton loading components

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function SkeletonText({ className = '' }: SkeletonProps) {
  return <Skeleton className={`h-4 ${className}`} />;
}

export function SkeletonTitle({ className = '' }: SkeletonProps) {
  return <Skeleton className={`h-8 ${className}`} />;
}

export function SkeletonCard({ className = '', children }: SkeletonProps & { children?: React.ReactNode }) {
  return (
    <div className={`bg-white rounded-2xl shadow-xl p-6 ${className}`}>
      {children}
    </div>
  );
}

// Dashboard Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-40 rounded-lg" />
          <Skeleton className="h-4 w-48 rounded mt-2" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* Net Worth Card */}
      <div className="bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="w-10 h-10 rounded-xl bg-white/30" />
          <Skeleton className="h-4 w-32 rounded bg-white/30" />
        </div>
        <Skeleton className="h-10 w-56 rounded-lg bg-white/30" />
        <Skeleton className="h-4 w-40 rounded mt-3 bg-white/30" />
      </div>

      {/* Account Type Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="w-8 h-8 rounded" />
              <Skeleton className="w-4 h-4 rounded" />
            </div>
            <Skeleton className="h-4 w-12 rounded mb-1" />
            <Skeleton className="h-6 w-20 rounded" />
          </div>
        ))}
      </div>

      {/* Stock Portfolio Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div>
            <Skeleton className="h-5 w-32 rounded mb-1" />
            <Skeleton className="h-3 w-48 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-20 rounded mb-2" />
              <Skeleton className="h-6 w-28 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Accounts List & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <Skeleton className="h-5 w-28 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
            <div className="divide-y divide-gray-100">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded" />
                    <div>
                      <Skeleton className="h-4 w-32 rounded mb-1" />
                      <Skeleton className="h-3 w-16 rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-20 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Projection Page Skeleton
export function ProjectionSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <Skeleton className="h-8 w-56 rounded-lg" />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4">
            <Skeleton className="h-3 w-24 rounded mb-2" />
            <Skeleton className="h-7 w-28 rounded" />
          </div>
        ))}
      </div>

      {/* Year-End Projection */}
      <div className="bg-gradient-to-r from-orange-400 to-orange-500 rounded-lg shadow p-6">
        <Skeleton className="h-5 w-40 rounded bg-white/30 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Skeleton className="h-3 w-40 rounded bg-white/30 mb-2" />
            <Skeleton className="h-9 w-48 rounded bg-white/30" />
          </div>
          <div>
            <Skeleton className="h-3 w-36 rounded bg-white/30 mb-2" />
            <Skeleton className="h-9 w-40 rounded bg-white/30" />
          </div>
        </div>
      </div>

      {/* Charts */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6">
          <Skeleton className="h-5 w-48 rounded mb-4" />
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
      ))}

      {/* Recurring Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <Skeleton className="h-5 w-44 rounded mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex justify-between items-center">
                  <div>
                    <Skeleton className="h-4 w-32 rounded mb-1" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                  <Skeleton className="h-5 w-24 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// P&L Page Skeleton
export function PnLSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div>
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-4 w-64 rounded mt-2" />
      </div>

      {/* Year Summary Card */}
      <div className="bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-10 h-10 rounded-xl bg-white/30" />
          <Skeleton className="h-4 w-36 rounded bg-white/30" />
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-24 rounded bg-white/30 mb-2" />
              <Skeleton className="h-8 w-32 rounded bg-white/30" />
            </div>
          ))}
        </div>
      </div>

      {/* Month Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <Skeleton className="h-5 w-28 rounded mb-1" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
              <Skeleton className="w-10 h-10 rounded-xl" />
            </div>
            <div className="space-y-2">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-16 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <Skeleton className="h-4 w-24 rounded mx-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Transfers Page Skeleton
export function TransfersSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      {/* Transfers List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <Skeleton className="h-5 w-36 rounded" />
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <Skeleton className="h-4 w-28 rounded mb-1.5" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
                <Skeleton className="w-6 h-6 rounded" />
                <div className="text-center">
                  <Skeleton className="h-4 w-28 rounded mb-1.5" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-14 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Categories Page Skeleton
export function CategoriesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-9 w-40 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded mt-2" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className={`px-6 py-4 ${i === 0 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`}>
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg bg-white/30" />
                <div>
                  <Skeleton className="h-4 w-36 rounded bg-white/30 mb-1" />
                  <Skeleton className="h-3 w-24 rounded bg-white/30" />
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="px-6 py-4 flex justify-between items-center">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Payees Page Skeleton
export function PayeesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-4 w-56 rounded mt-2" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* Payees List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div>
            <Skeleton className="h-4 w-24 rounded mb-1" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="px-6 py-4 flex justify-between items-center">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Currency Page Skeleton
export function CurrencySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-orange-400 to-amber-500 rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-xl bg-white/30" />
          <div>
            <Skeleton className="h-7 w-48 rounded bg-white/30 mb-1.5" />
            <Skeleton className="h-4 w-72 rounded bg-white/30" />
          </div>
        </div>
      </div>

      {/* Main Currency Selection */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <Skeleton className="h-5 w-36 rounded mb-1" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-5 rounded-xl border-2 border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <Skeleton className="w-8 h-8 rounded" />
                  <Skeleton className="h-8 w-10 rounded" />
                </div>
                <Skeleton className="h-4 w-12 rounded mb-1" />
                <Skeleton className="h-3 w-24 rounded mb-2" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Exchange Rates */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <Skeleton className="h-5 w-36 rounded mb-1" />
          <Skeleton className="h-4 w-96 rounded" />
        </div>
        <div className="divide-y divide-gray-100">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Skeleton className="w-7 h-7 rounded" />
                <div>
                  <Skeleton className="h-4 w-20 rounded mb-1" />
                  <Skeleton className="h-3 w-28 rounded" />
                </div>
              </div>
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-32 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Account Page Skeleton
export function AccountSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Account Header - Gradient Hero */}
      <div className="bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 rounded-2xl shadow-xl p-8">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl" />
            <div>
              <Skeleton className="h-7 w-44 rounded bg-white/20" />
              <Skeleton className="h-4 w-28 rounded bg-white/15 mt-1.5" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-9 h-9 bg-white/15 rounded-xl" />
            <div className="w-9 h-9 bg-white/15 rounded-xl" />
          </div>
        </div>
        <div className="mt-6">
          <Skeleton className="h-4 w-24 rounded bg-white/15" />
          <Skeleton className="h-10 w-52 rounded bg-white/20 mt-2" />
        </div>
      </div>

      {/* Recurring Transactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <Skeleton className="h-5 w-44 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="py-3 px-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Skeleton className="h-5 w-20 rounded" />
                <div>
                  <Skeleton className="h-4 w-32 rounded mb-1" />
                  <Skeleton className="h-3 w-40 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-14 rounded" />
                <Skeleton className="h-4 w-10 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <Skeleton className="h-5 w-28 rounded" />
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="py-3 px-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Skeleton className="h-5 w-20 rounded" />
                <div>
                  <Skeleton className="h-4 w-36 rounded mb-1" />
                  <Skeleton className="h-3 w-48 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-10 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
