/**
 * HazardReviewPanel - Example Usage
 * Demonstrates how to compose hazard review components in the dashboard
 */
import React, { useState } from 'react';
import { HazardReviewStats, HazardReviewCard, HazardReviewFilters } from './index';
import type { HazardReviewStatsData, HazardData, HazardFilters, ReviewAction } from './index';

// Mock data for demonstration
const mockStatsData: HazardReviewStatsData = {
  pendingReviews: 12,
  aiAccuracy: 87.5,
  falsePositiveRate: 8.2,
  totalPhotosAnalyzed: 342,
  severityBreakdown: {
    critical: 3,
    high: 5,
    medium: 8,
    low: 2,
  },
};

const mockHazards: HazardData[] = [
  {
    id: '1',
    photoUrl: '/api/placeholder/120/90',
    assetNumber: 'TL042',
    severity: 'critical',
    hazardType: 'Unsecured Load',
    description:
      'Cargo not properly secured with load straps. High risk of shifting during transport.',
    confidence: 92,
    location: 'Perth Depot',
    detectedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    recommendedActions: [
      'Immediately secure cargo with additional load straps',
      'Inspect existing tie-down points for damage',
      'Verify load weight distribution',
      'Document corrective actions taken',
    ],
  },
  {
    id: '2',
    photoUrl: '/api/placeholder/120/90',
    assetNumber: 'DL015',
    severity: 'high',
    hazardType: 'Tire Damage',
    description: 'Visible sidewall bulge on rear tire. Potential blowout risk.',
    confidence: 88,
    location: 'Bunbury',
    detectedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    recommendedActions: [
      'Replace damaged tire immediately',
      'Inspect other tires for similar damage',
      'Check tire pressure on all wheels',
    ],
  },
  {
    id: '3',
    photoUrl: '/api/placeholder/120/90',
    assetNumber: 'TL018',
    severity: 'medium',
    hazardType: 'Minor Frame Corrosion',
    description: 'Surface rust detected on undercarriage frame. Monitor for progression.',
    confidence: 75,
    location: 'Geraldton',
    detectedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    recommendedActions: [
      'Clean affected area and apply rust inhibitor',
      'Schedule detailed frame inspection',
      'Monitor in next 2 maintenance cycles',
    ],
  },
];

export const HazardReviewPanelExample: React.FC<{ isDark?: boolean }> = ({ isDark = true }) => {
  const [filters, setFilters] = useState<HazardFilters>({
    severities: [],
    status: 'pending',
    dateRange: '30d',
    searchQuery: '',
  });

  const handleReview = (hazardId: string, action: ReviewAction) => {
    console.log('Review action:', { hazardId, action });
    // In real implementation, this would call the API
  };

  // Filter hazards based on current filters
  const filteredHazards = mockHazards.filter((hazard) => {
    // Severity filter
    if (filters.severities.length > 0 && !filters.severities.includes(hazard.severity)) {
      return false;
    }

    // Search filter
    if (
      filters.searchQuery &&
      !hazard.assetNumber.toLowerCase().includes(filters.searchQuery.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: isDark ? '#ffffff' : '#0c4a6e' }}>
          Hazard Review Panel
        </h1>
        <p className="text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
          Review AI-detected freight hazards and provide feedback to improve accuracy
        </p>
      </div>

      {/* Stats Overview */}
      <HazardReviewStats data={mockStatsData} isDark={isDark} />

      {/* Two-column layout: Filters + Hazard List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <HazardReviewFilters filters={filters} onFiltersChange={setFilters} isDark={isDark} />
        </div>

        {/* Hazard Cards List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: isDark ? '#ffffff' : '#0c4a6e' }}>
              {filteredHazards.length} Hazard{filteredHazards.length !== 1 ? 's' : ''} Found
            </h2>
          </div>

          {/* Hazard Cards */}
          {filteredHazards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                No hazards match the current filters
              </p>
            </div>
          ) : (
            filteredHazards.map((hazard) => (
              <HazardReviewCard
                key={hazard.id}
                hazard={hazard}
                onReview={handleReview}
                isDark={isDark}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HazardReviewPanelExample;
