/**
 * CreateAssetModal — Modal for creating a new asset
 */
import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  AssetCategory,
  AssetCategoryLabels,
} from '@rgr/shared';
import { useCreateAsset, useDepots } from '@/hooks/useAssetData';
import type { CreateAssetInput } from '@rgr/shared';

interface CreateAssetModalProps {
  isDark: boolean;
  onClose: () => void;
}

export const CreateAssetModal = React.memo<CreateAssetModalProps>(
  ({ isDark, onClose }) => {
    const createAsset = useCreateAsset();
    const { data: depots = [] } = useDepots();
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState<CreateAssetInput>({
      assetNumber: '',
      category: 'trailer',
      subtype: null,
      make: null,
      model: null,
      yearManufactured: null,
      registrationNumber: null,
      registrationExpiry: null,
      assignedDepotId: null,
      notes: null,
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      try {
        await createAsset.mutateAsync(form);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create asset');
      }
    };

    const updateField = <K extends keyof CreateAssetInput>(
      key: K,
      value: CreateAssetInput[K]
    ) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    };

    const overlayBg = 'rgba(0, 0, 0, 0.6)';
    const modalBg = isDark ? 'rgba(15, 23, 42, 0.97)' : 'rgba(30, 30, 80, 0.97)';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)';
    const textColor = isDark ? 'text-slate-200' : 'text-white';
    const mutedColor = isDark ? 'text-slate-400' : 'text-white/60';
    const inputCls = isDark
      ? 'bg-slate-800/60 border-slate-700/50 text-slate-200 focus:border-blue-500/50'
      : 'bg-white/10 border-white/20 text-white focus:border-white/40';

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: overlayBg, backdropFilter: 'blur(4px)' }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="w-full max-w-lg rounded-xl overflow-hidden"
          style={{
            background: modalBg,
            border: `1px solid ${borderColor}`,
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b`} style={{ borderColor }}>
            <h2 className={`text-lg font-bold ${textColor}`}>Add New Asset</h2>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg ${mutedColor} hover:text-white hover:bg-white/10 transition-colors`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Asset Number */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${mutedColor}`}>
                Asset Number *
              </label>
              <input
                type="text"
                required
                value={form.assetNumber}
                onChange={(e) => updateField('assetNumber', e.target.value.toUpperCase())}
                placeholder="TL001"
                className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${inputCls}`}
              />
            </div>

            {/* Category */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${mutedColor}`}>
                Category *
              </label>
              <div className="flex gap-2">
                {(Object.values(AssetCategory) as AssetCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => updateField('category', cat)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.category === cat
                        ? 'bg-blue-600/25 border-blue-500/40 text-blue-300'
                        : `${inputCls}`
                    }`}
                  >
                    {AssetCategoryLabels[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Make / Model */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${mutedColor}`}>Make</label>
                <input
                  type="text"
                  value={form.make ?? ''}
                  onChange={(e) => updateField('make', e.target.value || null)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${inputCls}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${mutedColor}`}>Model</label>
                <input
                  type="text"
                  value={form.model ?? ''}
                  onChange={(e) => updateField('model', e.target.value || null)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${inputCls}`}
                />
              </div>
            </div>

            {/* Year / Rego */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${mutedColor}`}>Year</label>
                <input
                  type="number"
                  min={1900}
                  max={2100}
                  value={form.yearManufactured ?? ''}
                  onChange={(e) =>
                    updateField('yearManufactured', e.target.value ? Number(e.target.value) : null)
                  }
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${inputCls}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${mutedColor}`}>Registration #</label>
                <input
                  type="text"
                  value={form.registrationNumber ?? ''}
                  onChange={(e) => updateField('registrationNumber', e.target.value || null)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${inputCls}`}
                />
              </div>
            </div>

            {/* Depot */}
            {depots.length > 0 && (
              <div>
                <label className={`block text-xs font-medium mb-1 ${mutedColor}`}>Depot</label>
                <select
                  value={form.assignedDepotId ?? ''}
                  onChange={(e) => updateField('assignedDepotId', e.target.value || null)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${inputCls}`}
                >
                  <option value="">No depot assigned</option>
                  {depots.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-lg text-sm ${textColor} hover:bg-white/10 transition-colors`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createAsset.isPending || !form.assetNumber}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
              >
                {createAsset.isPending ? 'Creating...' : 'Create Asset'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
);

CreateAssetModal.displayName = 'CreateAssetModal';
