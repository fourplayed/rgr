/**
 * AnalysisHistoryPanel - View and search past photo analyses
 * Vision UI glassmorphism design with dark/light theme support
 *
 * Features:
 * - List past analyses with photo thumbnails
 * - Search by freight category, hazard type, date
 * - Filter by accuracy/feedback status
 * - View full analysis details
 * - Performance metrics summary
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Check,
  Clock,
  Package,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Loader2,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { getSupabase } from '@rgr/shared';
import { VisionCard } from '../vision/VisionCard';
import { RGR_COLORS } from '@/styles/color-palette';
import { ImageLightbox } from './ImageLightbox';

// ============================================================================
// Types
// ============================================================================

interface AnalysisHistoryItem {
  id: string;
  photoId: string;
  photoUrl: string;
  storagePath: string;
  freightCategory: string;
  freightDescription: string;
  confidence: number;
  hazardCount: number;
  status: string;
  wasReviewed: boolean;
  wasAccurate: boolean | null;
  analyzedAt: string;
  assetNumber?: string;
}

interface HistoryFilters {
  search: string;
  freightCategory: string;
  reviewStatus: 'all' | 'reviewed' | 'pending';
  accuracyFilter: 'all' | 'accurate' | 'inaccurate';
  dateRange: 'all' | 'today' | 'week' | 'month';
}

export interface AnalysisHistoryPanelProps {
  className?: string;
  isDark?: boolean;
  maxItems?: number;
}

// ============================================================================
// Constants
// ============================================================================

const FREIGHT_CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'machinery', label: 'Machinery' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'steel', label: 'Steel' },
  { value: 'timber', label: 'Timber' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'construction_supplies', label: 'Construction Supplies' },
  { value: 'dangerous_goods', label: 'Dangerous Goods' },
  { value: 'mixed_cargo', label: 'Mixed Cargo' },
  { value: 'unknown', label: 'Unknown' },
];

// ============================================================================
// Component
// ============================================================================

export const AnalysisHistoryPanel = React.memo<AnalysisHistoryPanelProps>(({
  className = '',
  isDark = true,
  maxItems = 50,
}) => {
  const [items, setItems] = useState<AnalysisHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Filters state
  const [filters, setFilters] = useState<HistoryFilters>({
    search: '',
    freightCategory: '',
    reviewStatus: 'all',
    accuracyFilter: 'all',
    dateRange: 'all',
  });

  // Theme colors
  const textPrimary = isDark ? '#ffffff' : '#000000';
  const textSecondary = isDark ? '#e2e8f0' : '#374151';
  const textMuted = isDark ? '#94a3b8' : '#6b7280';
  const borderColor = isDark ? `${RGR_COLORS.chrome.medium}33` : 'rgba(107, 114, 128, 0.75)';
  const headerBg = isDark ? '#060b28' : '#e5e7eb';
  const inputBg = isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.8)';

  // Fetch analysis history
  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Please sign in to view analysis history');
      }

      // Build query with filters
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('freight_analysis')
        .select(`
          id,
          photo_id,
          primary_freight_category,
          freight_description,
          confidence_score,
          analysis_status,
          analyzed_at,
          learning_weight,
          photos!inner (
            id,
            storage_path,
            asset_id,
            assets (
              asset_number
            )
          ),
          hazard_alerts (
            id,
            was_accurate,
            reviewed_at
          )
        `)
        .eq('analysis_status', 'completed')
        .order('analyzed_at', { ascending: false })
        .limit(maxItems);

      // Apply freight category filter
      if (filters.freightCategory) {
        query = query.eq('primary_freight_category', filters.freightCategory);
      }

      // Apply date filter
      if (filters.dateRange !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (filters.dateRange) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          default:
            startDate = new Date(0);
        }

        query = query.gte('analyzed_at', startDate.toISOString());
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // Get public URLs for photos and transform data
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedItems: AnalysisHistoryItem[] = (data || []).map((item: any) => {
        const photo = item.photos;
        const hazards = item.hazard_alerts || [];
        const hasReview = hazards.some((h: { reviewed_at: string | null }) => h.reviewed_at !== null);
        const reviewedHazards = hazards.filter((h: { was_accurate: boolean | null }) => h.was_accurate !== null);
        const accurateCount = reviewedHazards.filter((h: { was_accurate: boolean }) => h.was_accurate === true).length;

        return {
          id: item.id,
          photoId: photo?.id || '',
          photoUrl: photo?.storage_path
            ? `${supabaseUrl}/storage/v1/object/public/photos-compressed/${photo.storage_path}`
            : '',
          storagePath: photo?.storage_path || '',
          freightCategory: formatCategory(item.primary_freight_category),
          freightDescription: item.freight_description || '',
          confidence: Math.round((item.confidence_score || 0) * 100),
          hazardCount: hazards.length,
          status: item.analysis_status,
          wasReviewed: hasReview,
          wasAccurate: reviewedHazards.length > 0
            ? accurateCount === reviewedHazards.length
            : null,
          analyzedAt: item.analyzed_at,
          assetNumber: photo?.assets?.asset_number,
        };
      });

      // Apply client-side filters
      let filtered = transformedItems;

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(item =>
          item.freightCategory.toLowerCase().includes(searchLower) ||
          item.freightDescription.toLowerCase().includes(searchLower) ||
          (item.assetNumber && item.assetNumber.toLowerCase().includes(searchLower))
        );
      }

      // Review status filter
      if (filters.reviewStatus === 'reviewed') {
        filtered = filtered.filter(item => item.wasReviewed);
      } else if (filters.reviewStatus === 'pending') {
        filtered = filtered.filter(item => !item.wasReviewed && item.hazardCount > 0);
      }

      // Accuracy filter
      if (filters.accuracyFilter === 'accurate') {
        filtered = filtered.filter(item => item.wasAccurate === true);
      } else if (filters.accuracyFilter === 'inaccurate') {
        filtered = filtered.filter(item => item.wasAccurate === false);
      }

      setItems(filtered);
    } catch (err) {
      console.error('Failed to fetch analysis history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, [filters, maxItems]);

  // Initial fetch
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = items.length;
    const reviewed = items.filter(i => i.wasReviewed).length;
    const accurate = items.filter(i => i.wasAccurate === true).length;
    const inaccurate = items.filter(i => i.wasAccurate === false).length;
    const withHazards = items.filter(i => i.hazardCount > 0).length;

    return {
      total,
      reviewed,
      pending: total - reviewed,
      accurate,
      inaccurate,
      accuracyRate: reviewed > 0 ? Math.round((accurate / reviewed) * 100) : null,
      hazardRate: total > 0 ? Math.round((withHazards / total) * 100) : 0,
    };
  }, [items]);

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      return `${Math.round(diffMs / (1000 * 60))}m ago`;
    } else if (diffHours < 24) {
      return `${Math.round(diffHours)}h ago`;
    } else if (diffHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
    }
  };

  return (
    <VisionCard className={className} isDark={isDark} noPadding>
      {/* Header */}
      <div
        className="p-4 border-b flex-shrink-0"
        style={{ borderColor, background: headerBg }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" style={{ color: textPrimary }} />
            <h3 className="text-lg font-medium" style={{ color: textPrimary }}>
              Analysis History
            </h3>
            {!isLoading && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: inputBg, color: textMuted }}>
                {items.length} results
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                showFilters ? 'ring-2 ring-blue-500' : ''
              }`}
              style={{
                backgroundColor: showFilters ? 'rgba(59, 130, 246, 0.2)' : inputBg,
                color: showFilters ? '#3b82f6' : textMuted,
              }}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              type="button"
              onClick={fetchHistory}
              disabled={isLoading}
              className="p-1.5 rounded-lg transition-colors hover:bg-blue-500/10"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} style={{ color: textMuted }} />
            </button>
          </div>
        </div>

        {/* Metrics Summary */}
        {!isLoading && metrics.total > 0 && (
          <div className="flex items-center gap-4 mt-3 text-xs">
            {metrics.accuracyRate !== null && (
              <div className="flex items-center gap-1.5" style={{ color: metrics.accuracyRate >= 80 ? '#22c55e' : '#f59e0b' }}>
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{metrics.accuracyRate}% accuracy</span>
              </div>
            )}
            <div className="flex items-center gap-1.5" style={{ color: textMuted }}>
              <Check className="wније3.5 h-3.5" />
              <span>{metrics.reviewed} reviewed</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: textMuted }}>
              <Clock className="w-3.5 h-3.5" />
              <span>{metrics.pending} pending</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: textMuted }}>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{metrics.hazardRate}% with hazards</span>
            </div>
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 border-b space-y-3" style={{ borderColor, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: textMuted }} />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder="Search by category, description, asset..."
              className="w-full pl-10 pr-4 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap gap-2">
            {/* Category Filter */}
            <select
              value={filters.freightCategory}
              onChange={(e) => setFilters(f => ({ ...f, freightCategory: e.target.value }))}
              className="px-3 py-1.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
            >
              {FREIGHT_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            {/* Review Status Filter */}
            <select
              value={filters.reviewStatus}
              onChange={(e) => setFilters(f => ({ ...f, reviewStatus: e.target.value as HistoryFilters['reviewStatus'] }))}
              className="px-3 py-1.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
            >
              <option value="all">All Status</option>
              <option value="reviewed">Reviewed</option>
              <option value="pending">Pending Review</option>
            </select>

            {/* Accuracy Filter */}
            <select
              value={filters.accuracyFilter}
              onChange={(e) => setFilters(f => ({ ...f, accuracyFilter: e.target.value as HistoryFilters['accuracyFilter'] }))}
              className="px-3 py-1.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
            >
              <option value="all">All Accuracy</option>
              <option value="accurate">Accurate</option>
              <option value="inaccurate">Inaccurate</option>
            </select>

            {/* Date Filter */}
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(f => ({ ...f, dateRange: e.target.value as HistoryFilters['dateRange'] }))}
              className="px-3 py-1.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
            </select>

            {/* Clear Filters */}
            {(filters.search || filters.freightCategory || filters.reviewStatus !== 'all' || filters.accuracyFilter !== 'all' || filters.dateRange !== 'all') && (
              <button
                type="button"
                onClick={() => setFilters({
                  search: '',
                  freightCategory: '',
                  reviewStatus: 'all',
                  accuracyFilter: 'all',
                  dateRange: 'all',
                })}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ color: '#ef4444' }}
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 max-h-[500px] overflow-y-auto custom-scrollbar">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: textMuted }} />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div
            className="flex items-center gap-2 p-4 rounded-lg"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && items.length === 0 && (
          <div className="text-center py-12" style={{ color: textMuted }}>
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No analysis history found</p>
            <p className="text-xs mt-1">Upload and analyze photos to see them here</p>
          </div>
        )}

        {/* History List */}
        {!isLoading && !error && items.length > 0 && (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg overflow-hidden transition-all"
                style={{
                  backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.5)',
                  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                }}
              >
                {/* Item Header */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                >
                  {/* Thumbnail */}
                  <div
                    className="relative w-16 h-12 rounded overflow-hidden flex-shrink-0 cursor-zoom-in"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(item.photoUrl);
                    }}
                  >
                    {item.photoUrl ? (
                      <img
                        src={item.photoUrl}
                        alt="Analysis"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-black/20 flex items-center justify-center">
                        <Package className="w-4 h-4" style={{ color: textMuted }} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate" style={{ color: textPrimary }}>
                        {item.freightCategory}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded text-xs"
                        style={{
                          backgroundColor: item.confidence >= 80 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: item.confidence >= 80 ? '#22c55e' : '#f59e0b',
                        }}
                      >
                        {item.confidence}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: textMuted }}>
                      <span>{formatDate(item.analyzedAt)}</span>
                      {item.assetNumber && (
                        <>
                          <span>•</span>
                          <span>{item.assetNumber}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.hazardCount > 0 && (
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
                      >
                        {item.hazardCount} hazard{item.hazardCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {item.wasReviewed && (
                      item.wasAccurate ? (
                        <ThumbsUp className="w-4 h-4" style={{ color: '#22c55e' }} />
                      ) : (
                        <ThumbsDown className="w-4 h-4" style={{ color: '#ef4444' }} />
                      )
                    )}
                    {expandedItem === item.id ? (
                      <ChevronDown className="w-4 h-4" style={{ color: textMuted }} />
                    ) : (
                      <ChevronRight className="w-4 h-4" style={{ color: textMuted }} />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedItem === item.id && (
                  <div className="px-3 pb-3 pt-0 border-t" style={{ borderColor }}>
                    <p className="text-sm mt-2" style={{ color: textSecondary }}>
                      {item.freightDescription || 'No description available'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        src={selectedImage || ''}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        alt="Analysis photo"
      />
    </VisionCard>
  );
});

AnalysisHistoryPanel.displayName = 'AnalysisHistoryPanel';

// Helper function
function formatCategory(category: string | null): string {
  if (!category) return 'Unknown';
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default AnalysisHistoryPanel;
