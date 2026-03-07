/**
 * EditAssetForm — Inline edit form shown in the detail overview tab
 */
import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AssetCategory, AssetCategoryLabels, AssetStatus, AssetStatusLabels } from '@rgr/shared';
import type { AssetWithRelations, UpdateAssetInput } from '@rgr/shared';
import { useUpdateAsset, useDepots } from '@/hooks/useAssetData';

interface EditAssetFormProps {
  asset: AssetWithRelations;
  isDark: boolean;
  onClose: () => void;
}

export const EditAssetForm = React.memo<EditAssetFormProps>(({ asset, isDark, onClose }) => {
  const updateAsset = useUpdateAsset();
  const { data: depots = [] } = useDepots();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<UpdateAssetInput>({
    assetNumber: asset.assetNumber,
    category: asset.category,
    subtype: asset.subtype,
    status: asset.status,
    make: asset.make,
    model: asset.model,
    yearManufactured: asset.yearManufactured,
    registrationNumber: asset.registrationNumber,
    registrationExpiry: asset.registrationExpiry,
    assignedDepotId: asset.assignedDepotId,
    notes: asset.notes,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await updateAsset.mutateAsync({ id: asset.id, input: form });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update asset');
    }
  };

  const updateField = <K extends keyof UpdateAssetInput>(key: K, value: UpdateAssetInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const textColor = isDark ? 'text-slate-200' : 'text-white';
  const mutedColor = isDark ? 'text-slate-400' : 'text-white/60';
  const inputCls = isDark
    ? 'bg-slate-800/60 border-slate-700/50 text-slate-200 focus:border-blue-500/50'
    : 'bg-white/10 border-white/20 text-white focus:border-white/40';

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      {/* Back button */}
      <button
        type="button"
        onClick={onClose}
        className={`flex items-center gap-1 text-xs ${mutedColor} hover:text-white transition-colors`}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to overview
      </button>

      {/* Status */}
      <div>
        <label className={`block text-xs font-medium mb-1 ${mutedColor}`}>Status</label>
        <select
          value={form.status ?? asset.status}
          onChange={(e) => updateField('status', e.target.value as AssetStatus)}
          className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${inputCls}`}
        >
          {(Object.values(AssetStatus) as AssetStatus[]).map((s) => (
            <option key={s} value={s}>
              {AssetStatusLabels[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Category */}
      <div>
        <label className={`block text-xs font-medium mb-1 ${mutedColor}`}>Category</label>
        <div className="flex gap-2">
          {(Object.values(AssetCategory) as AssetCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => updateField('category', cat)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                form.category === cat ? 'bg-blue-600/25 border-blue-500/40 text-blue-300' : inputCls
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
          <label className={`block text-xs font-medium mb-1 ${mutedColor}`}>Rego #</label>
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
            <option value="">No depot</option>
            {depots.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className={`block text-xs font-medium mb-1 ${mutedColor}`}>Notes</label>
        <textarea
          value={form.notes ?? ''}
          onChange={(e) => updateField('notes', e.target.value || null)}
          rows={3}
          className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors resize-none ${inputCls}`}
        />
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-400">{error}</p>}

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
          disabled={updateAsset.isPending}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
        >
          {updateAsset.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
});

EditAssetForm.displayName = 'EditAssetForm';
