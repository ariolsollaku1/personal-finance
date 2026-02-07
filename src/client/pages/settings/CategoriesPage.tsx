import { useState } from 'react';
import { Category, categoriesApi } from '../../lib/api';
import { CategoriesSkeleton } from '../../components/Skeleton';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';
import { useSWR } from '../../hooks/useSWR';
import ConfirmModal from '../../components/ConfirmModal';
import AddCategoryModal from '../../components/AddCategoryModal';

export default function CategoriesPage() {
  const { data: categories, loading } = useSWR('/categories', () => categoriesApi.getAll());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const toast = useToast();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const handleUpdate = async (id: number) => {
    try {
      await categoriesApi.update(id, { name: editName });
      setEditingId(null);
    } catch (err) {
      toast.error('Category', err instanceof Error ? err.message : 'Failed to update category');
    }
  };

  const handleDelete = async (id: number) => {
    if (!await confirm({ title: 'Delete Category', message: 'Are you sure you want to delete this category?', confirmLabel: 'Delete', variant: 'danger' })) return;
    try {
      await categoriesApi.delete(id);
    } catch (err) {
      toast.error('Category', err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const allCategories = categories ?? [];
  const incomeCategories = allCategories.filter((c) => c.type === 'income');
  const expenseCategories = allCategories.filter((c) => c.type === 'expense');

  if (loading) {
    return <CategoriesSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Categories</h2>
          <p className="text-sm text-gray-500 mt-0.5">Organize your transactions by category</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Category
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income Categories */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100/80 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-200/80 shadow-sm shadow-green-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Income Categories</h2>
              <p className="text-sm text-gray-500">{incomeCategories.length} categories</p>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {incomeCategories.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No income categories</p>
              </div>
            ) : (
              incomeCategories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  editingId={editingId}
                  editName={editName}
                  setEditingId={setEditingId}
                  setEditName={setEditName}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>

        {/* Expense Categories */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100/80 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-rose-200/80 shadow-sm shadow-red-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Expense Categories</h2>
              <p className="text-sm text-gray-500">{expenseCategories.length} categories</p>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {expenseCategories.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No expense categories</p>
              </div>
            ) : (
              expenseCategories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  editingId={editingId}
                  editName={editName}
                  setEditingId={setEditingId}
                  setEditName={setEditName}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <AddCategoryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={() => {}}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}

interface CategoryItemProps {
  category: Category;
  editingId: number | null;
  editName: string;
  setEditingId: (id: number | null) => void;
  setEditName: (name: string) => void;
  onUpdate: (id: number) => void;
  onDelete: (id: number) => void;
}

function CategoryItem({ category, editingId, editName, setEditingId, setEditName, onUpdate, onDelete }: CategoryItemProps) {
  if (editingId === category.id) {
    return (
      <div className="px-6 py-4 flex gap-3 items-center bg-orange-50">
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="flex-1 px-4 py-3 bg-white border border-orange-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
          autoFocus
        />
        <button
          onClick={() => onUpdate(category.id)}
          className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
        >
          Save
        </button>
        <button
          onClick={() => setEditingId(null)}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors group">
      <span className="text-gray-900 font-medium">{category.name}</span>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => {
            setEditingId(category.id);
            setEditName(category.name);
          }}
          className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(category.id)}
          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
