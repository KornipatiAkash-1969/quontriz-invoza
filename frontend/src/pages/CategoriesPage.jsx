import React, { useState, useEffect } from 'react';
import {
  Tags,
  Plus,
  Edit2,
  Trash2,
  Package,
  TrendingUp,
  FolderOpen
} from 'lucide-react';
import { categoryApi } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { Spinner } from '../components/ui';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../context/ToastContext';

export default function CategoriesPage() {
  const { success: toastSuccess, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await categoryApi.getAll();
      setCategories(res.data || []);
    } catch (err) {
      toastError(err.message || 'Failed to fetch categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setCategoryName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setCategoryName(cat.category_name);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      toastError('Category name is required.');
      return;
    }

    try {
      if (editingCategory) {
        await categoryApi.update(editingCategory.id, { category_name: categoryName.trim() });
        toastSuccess('Category updated.');
      } else {
        await categoryApi.create({ category_name: categoryName.trim() });
        toastSuccess('Category created.');
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      toastError(err.message || 'Operation failed.');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await categoryApi.delete(deleteId);
      toastSuccess('Category deleted.');
      setDeleteId(null);
      fetchCategories();
    } catch (err) {
      toastError(err.message || 'Failed to delete category.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Category Management</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Organize products into departments. The AI classification engine maps items automatically to these categories.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Category</span>
        </button>
      </div>

      {/* Categories Cards / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Spinner />
            <p className="text-xs text-slate-500">Loading categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No categories defined.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70">
                  <th className="py-2.5 px-3 sm:px-4">Category Name</th>
                  <th className="py-2.5 px-3 sm:px-4">Classified Items</th>
                  <th className="py-2.5 px-3 sm:px-4">Total Purchase Spend</th>
                  <th className="py-2.5 px-3 sm:px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 sm:px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          <Tags className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-800 text-xs sm:text-sm">
                          {cat.category_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 sm:px-4">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {cat.items_count || 0} items
                      </span>
                    </td>
                    <td className="py-2.5 px-3 sm:px-4 font-extrabold text-slate-900 text-xs sm:text-sm">
                      {formatCurrency(cat.total_purchase_amount)}
                    </td>
                    <td className="py-2.5 px-3 sm:px-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(cat)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit Category"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(cat.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create New Category'}
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              {editingCategory ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
              placeholder="e.g. Frozen Foods, Pet Supplies, Beverages"
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category? Associated items will be reassigned to 'Other'."
        confirmText="Delete Category"
        isDanger={true}
        loading={deleting}
      />
    </div>
  );
}
