import { useState, useEffect } from 'react';
import { Category, categoriesApi } from '../../lib/api';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [newCategory, setNewCategory] = useState({ name: '', type: 'expense' as 'income' | 'expense' });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await categoriesApi.getAll();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await categoriesApi.create(newCategory);
      setNewCategory({ name: '', type: 'expense' });
      setShowAddForm(false);
      loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add category');
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      await categoriesApi.update(id, { name: editName });
      setEditingId(null);
      loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update category');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this category?')) return;
    try {
      await categoriesApi.delete(id);
      loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading categories...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showAddForm ? 'Cancel' : 'Add Category'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleAdd} className="flex gap-4">
            <input
              type="text"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Category name"
              required
            />
            <select
              value={newCategory.type}
              onChange={(e) =>
                setNewCategory({ ...newCategory, type: e.target.value as 'income' | 'expense' })
              }
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income Categories */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 bg-green-50">
            <h2 className="text-lg font-semibold text-green-800">Income Categories</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {incomeCategories.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No income categories</div>
            ) : (
              incomeCategories.map((category) => (
                <div key={category.id} className="p-4 flex justify-between items-center">
                  {editingId === category.id ? (
                    <div className="flex gap-2 flex-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdate(category.id)}
                        className="text-green-600 hover:text-green-800"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-gray-900">{category.name}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(category.id);
                            setEditName(category.name);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expense Categories */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 bg-red-50">
            <h2 className="text-lg font-semibold text-red-800">Expense Categories</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {expenseCategories.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No expense categories</div>
            ) : (
              expenseCategories.map((category) => (
                <div key={category.id} className="p-4 flex justify-between items-center">
                  {editingId === category.id ? (
                    <div className="flex gap-2 flex-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdate(category.id)}
                        className="text-green-600 hover:text-green-800"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-gray-900">{category.name}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(category.id);
                            setEditName(category.name);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
