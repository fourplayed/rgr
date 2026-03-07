/**
 * CreateAssetSlideout — Right-side panel for creating a new asset
 *
 * Slides in from the right with glassmorphic dark blue styling,
 * matching the AssetDetailSlideout pattern.
 */
import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { AssetCategory, AssetCategoryLabels } from '@rgr/shared';
import { useCreateAsset, useDepots } from '@/hooks/useAssetData';
import type { CreateAssetInput } from '@rgr/shared';

interface CreateAssetModalProps {
  isDark: boolean;
  onClose: () => void;
}

export const CreateAssetModal = React.memo<CreateAssetModalProps>(({ isDark, onClose }) => {
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

  const updateField = <K extends keyof CreateAssetInput>(key: K, value: CreateAssetInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const bg = isDark ? 'rgba(6, 11, 40, 0.92)' : 'rgba(0, 0, 100, 0.92)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)';
  const textColor = isDark ? 'text-slate-200' : 'text-white';
  const mutedColor = isDark ? 'text-slate-400' : 'text-white/60';
  const labelColor = isDark ? 'text-slate-400' : 'text-white/70';
  const inputStyle: React.CSSProperties = isDark
    ? {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(235, 235, 235, 0.12)',
        color: '#e2e8f0',
      }
    : {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: '#ffffff',
      };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Slideout panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md flex flex-col"
        style={{
          background: bg,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderLeft: `1px solid ${borderColor}`,
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: `1px solid ${borderColor}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <Plus className="w-5 h-5 text-blue-400" />
            </div>
            <h2
              className={`text-lg font-bold ${textColor}`}
              style={{ fontFamily: "'Lato', sans-serif" }}
            >
              Add New Asset
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg ${mutedColor} hover:text-white hover:bg-white/10 transition-colors`}
            aria-label="Close create asset modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form — scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Asset Number */}
          <div>
            <label
              className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${labelColor}`}
              style={{ fontFamily: "'Lato', sans-serif" }}
            >
              Asset Number *
            </label>
            <input
              type="text"
              required
              value={form.assetNumber}
              onChange={(e) => updateField('assetNumber', e.target.value.toUpperCase())}
              placeholder="TL001"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={inputStyle}
            />
          </div>

          {/* Category */}
          <div>
            <label
              className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${labelColor}`}
              style={{ fontFamily: "'Lato', sans-serif" }}
            >
              Category *
            </label>
            <div className="flex gap-2">
              {(Object.values(AssetCategory) as AssetCategory[]).map((cat) => {
                const isSelected = form.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => updateField('category', cat)}
                    className="flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      background: isSelected
                        ? 'rgba(59, 130, 246, 0.25)'
                        : inputStyle.backgroundColor,
                      border: isSelected ? '1px solid rgba(59, 130, 246, 0.5)' : inputStyle.border,
                      color: isSelected ? '#93c5fd' : (inputStyle.color as string),
                    }}
                  >
                    {AssetCategoryLabels[cat]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Make / Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${labelColor}`}
                style={{ fontFamily: "'Lato', sans-serif" }}
              >
                Make
              </label>
              <input
                type="text"
                value={form.make ?? ''}
                onChange={(e) => updateField('make', e.target.value || null)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${labelColor}`}
                style={{ fontFamily: "'Lato', sans-serif" }}
              >
                Model
              </label>
              <input
                type="text"
                value={form.model ?? ''}
                onChange={(e) => updateField('model', e.target.value || null)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Year / Rego */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${labelColor}`}
                style={{ fontFamily: "'Lato', sans-serif" }}
              >
                Year
              </label>
              <input
                type="number"
                min={1900}
                max={2100}
                value={form.yearManufactured ?? ''}
                onChange={(e) =>
                  updateField('yearManufactured', e.target.value ? Number(e.target.value) : null)
                }
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${labelColor}`}
                style={{ fontFamily: "'Lato', sans-serif" }}
              >
                Registration #
              </label>
              <input
                type="text"
                value={form.registrationNumber ?? ''}
                onChange={(e) => updateField('registrationNumber', e.target.value || null)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Registration Expiry */}
          <div>
            <label
              className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${labelColor}`}
              style={{ fontFamily: "'Lato', sans-serif" }}
            >
              Registration Expiry
            </label>
            <input
              type="date"
              value={form.registrationExpiry ?? ''}
              onChange={(e) => updateField('registrationExpiry', e.target.value || null)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={inputStyle}
            />
          </div>

          {/* Depot */}
          {depots.length > 0 && (
            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${labelColor}`}
                style={{ fontFamily: "'Lato', sans-serif" }}
              >
                Depot
              </label>
              <select
                value={form.assignedDepotId ?? ''}
                onChange={(e) => updateField('assignedDepotId', e.target.value || null)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors cursor-pointer"
                style={{
                  ...inputStyle,
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                }}
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

          {/* Notes */}
          <div>
            <label
              className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${labelColor}`}
              style={{ fontFamily: "'Lato', sans-serif" }}
            >
              Notes
            </label>
            <textarea
              rows={3}
              value={form.notes ?? ''}
              onChange={(e) => updateField('notes', e.target.value || null)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors resize-none"
              style={inputStyle}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              className="px-3 py-2 rounded-lg text-sm text-red-300"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              {error}
            </div>
          )}
        </form>

        {/* Footer — fixed at bottom */}
        <div
          className="flex justify-end gap-3 px-6 py-4 flex-shrink-0"
          style={{ borderTop: `1px solid ${borderColor}` }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium ${textColor} hover:bg-white/10 transition-colors`}
            style={{ fontFamily: "'Lato', sans-serif" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-asset-form"
            disabled={createAsset.isPending || !form.assetNumber}
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40"
            style={{
              fontFamily: "'Lato', sans-serif",
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
            }}
          >
            {createAsset.isPending ? 'Creating...' : 'Create Asset'}
          </button>
        </div>
      </motion.div>
    </>
  );
});

CreateAssetModal.displayName = 'CreateAssetModal';
