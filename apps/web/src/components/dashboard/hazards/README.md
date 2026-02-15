# Hazard Review Components

Vision UI glassmorphism components for AI hazard detection review in the RGR Fleet Manager dashboard.

## Components

### HazardReviewStats
Summary statistics card showing:
- Pending reviews count
- AI accuracy percentage (color-coded)
- False positive rate
- Severity breakdown with stacked bar chart

```tsx
import { HazardReviewStats } from './hazards';

<HazardReviewStats
  data={{
    pendingReviews: 12,
    aiAccuracy: 87.5,
    falsePositiveRate: 8.2,
    severityBreakdown: {
      critical: 3,
      high: 5,
      medium: 8,
      low: 2,
    }
  }}
  isDark={true}
/>
```

### HazardReviewCard
Individual hazard review card with:
- Photo thumbnail (120x90px) with asset badge
- Severity badge (Critical/High/Medium/Low)
- Hazard type and description
- AI confidence score bar
- Location and timestamp
- Review action buttons (Confirm/False Positive/Needs Training)
- Expandable recommended actions

```tsx
import { HazardReviewCard } from './hazards';

<HazardReviewCard
  hazard={{
    id: '1',
    photoUrl: '/path/to/photo.jpg',
    assetNumber: 'TL042',
    severity: 'critical',
    hazardType: 'Unsecured Load',
    description: 'Cargo not properly secured...',
    confidence: 92,
    location: 'Perth Depot',
    detectedAt: '2024-01-08T10:30:00Z',
    recommendedActions: ['Secure cargo', 'Inspect tie-downs']
  }}
  onReview={(id, action) => console.log(id, action)}
  isDark={true}
/>
```

### HazardReviewFilters
Filter controls including:
- Asset number search
- Severity chip toggles (multi-select)
- Status dropdown (Pending/Reviewed/All)
- Date range dropdown
- Active filter summary

```tsx
import { HazardReviewFilters } from './hazards';

<HazardReviewFilters
  filters={{
    severities: ['critical', 'high'],
    status: 'pending',
    dateRange: '30d',
    searchQuery: 'TL'
  }}
  onFiltersChange={(filters) => setFilters(filters)}
  isDark={true}
/>
```

## Severity Colors

```typescript
critical: '#ef4444'  // red-500
high: '#f97316'      // orange-500
medium: '#f59e0b'    // amber-500
low: '#22c55e'       // green-500
```

## Review Actions

```typescript
type ReviewAction = 'confirm' | 'false_positive' | 'needs_training';
```

- **confirm**: Hazard is correctly detected
- **false_positive**: Incorrect detection (train AI to avoid)
- **needs_training**: Uncertain, requires human review

## Theme Support

All components support both dark and light themes via the `isDark` prop (default: `true`).

## Layout Recommendations

### Full Page Layout
```tsx
<div className="space-y-6">
  <HazardReviewStats data={stats} isDark={isDark} />

  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
    <div className="lg:col-span-1">
      <HazardReviewFilters {...filterProps} />
    </div>

    <div className="lg:col-span-3 space-y-4">
      {hazards.map(hazard => (
        <HazardReviewCard key={hazard.id} {...cardProps} />
      ))}
    </div>
  </div>
</div>
```

## Example

See `HazardReviewPanel.example.tsx` for a complete working example with mock data.

## Accessibility

- Keyboard navigation supported
- WCAG AA compliant color contrast
- Screen reader friendly
- Focus visible indicators
- Respects `prefers-reduced-motion`

## Design System

Follows Vision UI glassmorphism patterns:
- VisionCard containers
- RGR color palette
- Standard spacing and typography
- Consistent animations and transitions

For detailed design documentation, see `/docs/hazard-review-ui-design.md`.
