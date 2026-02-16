/**
 * AnalysisFeedbackPanel - Review and provide feedback on AI analysis accuracy
 * Used for measuring AI performance and improving the system over time
 *
 * Features:
 * - Rate overall freight classification accuracy
 * - Mark individual hazards as accurate/false positive
 * - Report missed hazards
 * - Submit feedback notes
 * - Track AI performance metrics
 */
import React, { useState, useCallback } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Check,
  X,
  MessageSquare,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp,
} from 'lucide-react';
import { getSupabaseClient } from '@rgr/shared';
import type { AnalysisResult } from '@/hooks/usePhotoAnalysis';

// ============================================================================
// Types
// ============================================================================

export interface HazardFeedback {
  hazardId: string;
  wasAccurate: boolean | null; // null = not reviewed
  notes?: string;
}

export interface AnalysisFeedbackData {
  analysisId: string;
  freightClassificationAccurate: boolean | null;
  correctCategory?: string;
  hazardFeedback: HazardFeedback[];
  missedHazards: string[];
  generalNotes: string;
}

export interface AnalysisFeedbackPanelProps {
  result: AnalysisResult;
  onFeedbackSubmitted?: (feedback: AnalysisFeedbackData) => void;
  className?: string;
  isDark?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const FREIGHT_CATEGORIES = [
  'Machinery',
  'Vehicles',
  'Mining Equipment',
  'Oversized Load',
  'Steel',
  'Timber',
  'Concrete',
  'Scaffolding',
  'Construction Supplies',
  'Pallets',
  'Containers',
  'Wrapped Goods',
  'Mixed Cargo',
  'Dangerous Goods',
  'Unknown',
];

const COMMON_MISSED_HAZARDS = [
  'Unsecured Load',
  'Missing Restraints',
  'Improper Strapping',
  'Shifting Risk',
  'Uneven Loading',
  'Overhanging Cargo',
  'Missing DG Placard',
  'Sharp Edges Exposed',
  'Damaged Packaging',
  'Spill Risk',
];

// ============================================================================
// Component
// ============================================================================

export const AnalysisFeedbackPanel = React.memo<AnalysisFeedbackPanelProps>(({
  result,
  onFeedbackSubmitted,
  className = '',
  isDark = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Feedback state
  const [freightAccurate, setFreightAccurate] = useState<boolean | null>(null);
  const [correctCategory, setCorrectCategory] = useState<string>('');
  const [hazardFeedback, setHazardFeedback] = useState<Record<string, boolean | null>>({});
  const [missedHazards, setMissedHazards] = useState<string[]>([]);
  const [customMissedHazard, setCustomMissedHazard] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  // Theme colors
  const textPrimary = isDark ? '#ffffff' : '#000000';
  const textSecondary = isDark ? '#e2e8f0' : '#374151';
  const textMuted = isDark ? '#94a3b8' : '#6b7280';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const inputBg = isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.8)';

  // Toggle hazard accuracy
  const toggleHazardAccuracy = useCallback((hazardId: string, accurate: boolean) => {
    setHazardFeedback(prev => ({
      ...prev,
      [hazardId]: prev[hazardId] === accurate ? null : accurate,
    }));
  }, []);

  // Toggle missed hazard
  const toggleMissedHazard = useCallback((hazard: string) => {
    setMissedHazards(prev =>
      prev.includes(hazard)
        ? prev.filter(h => h !== hazard)
        : [...prev, hazard]
    );
  }, []);

  // Add custom missed hazard
  const addCustomMissedHazard = useCallback(() => {
    if (customMissedHazard.trim() && !missedHazards.includes(customMissedHazard.trim())) {
      setMissedHazards(prev => [...prev, customMissedHazard.trim()]);
      setCustomMissedHazard('');
    }
  }, [customMissedHazard, missedHazards]);

  // Submit feedback
  const submitFeedback = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Please sign in to submit feedback');
      }

      // Update freight_analysis with freight classification feedback
      if (freightAccurate !== null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('freight_analysis')
          .update({
            learning_weight: freightAccurate ? 1.2 : 0.5, // Boost or reduce learning weight
            updated_at: new Date().toISOString(),
          })
          .eq('id', result.analysisId);
      }

      // Update hazard_alerts with individual feedback
      for (const hazard of result.hazards) {
        const feedback = hazardFeedback[hazard.id];
        if (feedback !== null && feedback !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('hazard_alerts')
            .update({
              review_outcome: feedback ? 'confirmed' : 'false_positive',
              manager_review_at: new Date().toISOString(),
              manager_review_by: user.id,
              review_notes: generalNotes || null,
              updated_at: new Date().toISOString(),
            })
            .eq('freight_analysis_id', result.analysisId)
            .eq('hazard_type', hazard.hazardType.toLowerCase().replace(/ /g, '_'));
        }
      }

      // TODO: Create safla_freight_patterns table in a migration.
      // Log missed hazards for training once the table exists.
      // if (missedHazards.length > 0) {
      //   await supabase
      //     .from('safla_freight_patterns')
      //     .upsert({
      //       pattern_type: 'missed_hazard',
      //       pattern_key: `missed_${result.photoId}_${Date.now()}`,
      //       pattern_features: {
      //         photoId: result.photoId,
      //         analysisId: result.analysisId,
      //         missedHazards: missedHazards,
      //         freightCategory: result.freight.primaryCategory,
      //         reportedBy: user.id,
      //         reportedAt: new Date().toISOString(),
      //       },
      //       pattern_confidence: 1.0,
      //       source_photo_ids: [result.photoId],
      //       source_analysis_ids: [result.analysisId],
      //     }, { onConflict: 'pattern_type,pattern_key' });
      // }

      // Build feedback data for callback
      const feedbackData: AnalysisFeedbackData = {
        analysisId: result.analysisId,
        freightClassificationAccurate: freightAccurate,
        correctCategory: freightAccurate === false ? correctCategory : undefined,
        hazardFeedback: Object.entries(hazardFeedback).map(([id, accurate]) => ({
          hazardId: id,
          wasAccurate: accurate,
        })),
        missedHazards,
        generalNotes,
      };

      setSubmitted(true);
      onFeedbackSubmitted?.(feedbackData);

    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    result,
    freightAccurate,
    correctCategory,
    hazardFeedback,
    missedHazards,
    generalNotes,
    onFeedbackSubmitted,
  ]);

  // Check if any feedback has been provided
  const hasFeedback = freightAccurate !== null ||
    Object.values(hazardFeedback).some(v => v !== null) ||
    missedHazards.length > 0 ||
    generalNotes.trim().length > 0;

  // Calculate accuracy stats from current feedback
  const reviewedHazards = Object.values(hazardFeedback).filter(v => v !== null).length;
  const accurateHazards = Object.values(hazardFeedback).filter(v => v === true).length;
  const falsePositives = Object.values(hazardFeedback).filter(v => v === false).length;

  if (submitted) {
    return (
      <div
        className={`rounded-lg p-4 ${className}`}
        style={{
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
          >
            <Check className="w-5 h-5" style={{ color: '#22c55e' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#22c55e' }}>
              Feedback Submitted
            </p>
            <p className="text-xs mt-0.5" style={{ color: textSecondary }}>
              Thank you! Your feedback helps improve AI accuracy.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg overflow-hidden ${className}`}
      style={{
        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.05)',
        border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.3)'}`,
      }}
    >
      {/* Header - Always Visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left transition-colors hover:bg-blue-500/5"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color: '#3b82f6' }} />
          <span className="text-sm font-semibold" style={{ color: textPrimary }}>
            Review AI Accuracy
          </span>
          {hasFeedback && !isExpanded && (
            <span
              className="px-1.5 py-0.5 rounded text-xs"
              style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}
            >
              In Progress
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: textMuted }}>
            Help improve detection
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" style={{ color: textMuted }} />
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: textMuted }} />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {/* Freight Classification Accuracy */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: textPrimary }}>
              Was the freight classification correct?
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm px-2 py-1 rounded" style={{ backgroundColor: inputBg, color: textSecondary }}>
                {result.freight.primaryCategory}
              </span>
              <button
                type="button"
                onClick={() => setFreightAccurate(freightAccurate === true ? null : true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  freightAccurate === true ? 'ring-2 ring-green-500' : ''
                }`}
                style={{
                  backgroundColor: freightAccurate === true ? 'rgba(34, 197, 94, 0.2)' : inputBg,
                  color: freightAccurate === true ? '#22c55e' : textMuted,
                }}
              >
                <ThumbsUp className="w-4 h-4" />
                Correct
              </button>
              <button
                type="button"
                onClick={() => setFreightAccurate(freightAccurate === false ? null : false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  freightAccurate === false ? 'ring-2 ring-red-500' : ''
                }`}
                style={{
                  backgroundColor: freightAccurate === false ? 'rgba(239, 68, 68, 0.2)' : inputBg,
                  color: freightAccurate === false ? '#ef4444' : textMuted,
                }}
              >
                <ThumbsDown className="w-4 h-4" />
                Wrong
              </button>
            </div>

            {/* Correct category selector (if marked wrong) */}
            {freightAccurate === false && (
              <div className="mt-2">
                <label className="text-xs" style={{ color: textMuted }}>
                  What should it be?
                </label>
                <select
                  value={correctCategory}
                  onChange={(e) => setCorrectCategory(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: inputBg,
                    borderColor: borderColor,
                    color: textPrimary,
                  }}
                >
                  <option value="">Select correct category...</option>
                  {FREIGHT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Hazard Accuracy Review */}
          {result.hazards.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: textPrimary }}>
                Hazard Detection Accuracy
              </label>
              <div className="space-y-2">
                {result.hazards.map((hazard) => (
                  <div
                    key={hazard.id}
                    className="flex items-center justify-between p-2 rounded-lg"
                    style={{ backgroundColor: inputBg }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
                      <span className="text-sm truncate" style={{ color: textSecondary }}>
                        {hazard.hazardType}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleHazardAccuracy(hazard.id, true)}
                        className={`p-1.5 rounded transition-all ${
                          hazardFeedback[hazard.id] === true ? 'ring-2 ring-green-500' : ''
                        }`}
                        style={{
                          backgroundColor: hazardFeedback[hazard.id] === true
                            ? 'rgba(34, 197, 94, 0.2)'
                            : 'transparent',
                        }}
                        title="Correct detection"
                      >
                        <Check className="w-4 h-4" style={{
                          color: hazardFeedback[hazard.id] === true ? '#22c55e' : textMuted
                        }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleHazardAccuracy(hazard.id, false)}
                        className={`p-1.5 rounded transition-all ${
                          hazardFeedback[hazard.id] === false ? 'ring-2 ring-red-500' : ''
                        }`}
                        style={{
                          backgroundColor: hazardFeedback[hazard.id] === false
                            ? 'rgba(239, 68, 68, 0.2)'
                            : 'transparent',
                        }}
                        title="False positive"
                      >
                        <X className="w-4 h-4" style={{
                          color: hazardFeedback[hazard.id] === false ? '#ef4444' : textMuted
                        }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Accuracy summary */}
              {reviewedHazards > 0 && (
                <div className="flex items-center gap-2 text-xs" style={{ color: textMuted }}>
                  <TrendingUp className="w-3 h-3" />
                  <span>
                    {accurateHazards}/{reviewedHazards} correct
                    {falsePositives > 0 && `, ${falsePositives} false positive${falsePositives > 1 ? 's' : ''}`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Missed Hazards */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: textPrimary }}>
              Any hazards the AI missed?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_MISSED_HAZARDS.map((hazard) => (
                <button
                  key={hazard}
                  type="button"
                  onClick={() => toggleMissedHazard(hazard)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    missedHazards.includes(hazard) ? 'ring-2 ring-orange-500' : ''
                  }`}
                  style={{
                    backgroundColor: missedHazards.includes(hazard)
                      ? 'rgba(249, 115, 22, 0.2)'
                      : inputBg,
                    color: missedHazards.includes(hazard) ? '#f97316' : textMuted,
                  }}
                >
                  {hazard}
                </button>
              ))}
            </div>

            {/* Custom missed hazard input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customMissedHazard}
                onChange={(e) => setCustomMissedHazard(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomMissedHazard()}
                placeholder="Other hazard..."
                className="flex-1 px-3 py-1.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: inputBg,
                  borderColor: borderColor,
                  color: textPrimary,
                }}
              />
              <button
                type="button"
                onClick={addCustomMissedHazard}
                disabled={!customMissedHazard.trim()}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  color: '#3b82f6',
                }}
              >
                Add
              </button>
            </div>

            {/* Selected missed hazards */}
            {missedHazards.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {missedHazards.map((hazard) => (
                  <span
                    key={hazard}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: 'rgba(249, 115, 22, 0.2)',
                      color: '#f97316',
                    }}
                  >
                    {hazard}
                    <button
                      type="button"
                      onClick={() => toggleMissedHazard(hazard)}
                      className="hover:bg-orange-500/20 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* General Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2" style={{ color: textPrimary }}>
              <MessageSquare className="w-4 h-4" />
              Additional Notes (optional)
            </label>
            <textarea
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Any other feedback about the analysis..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{
                backgroundColor: inputBg,
                borderColor: borderColor,
                color: textPrimary,
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="flex items-center gap-2 p-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
              }}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="button"
            onClick={submitFeedback}
            disabled={!hasFeedback || isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
            style={{
              backgroundColor: hasFeedback ? '#3b82f6' : inputBg,
              color: hasFeedback ? '#ffffff' : textMuted,
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Feedback
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
});

AnalysisFeedbackPanel.displayName = 'AnalysisFeedbackPanel';

export default AnalysisFeedbackPanel;
