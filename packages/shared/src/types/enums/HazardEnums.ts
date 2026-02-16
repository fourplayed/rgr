import { z } from 'zod';

/**
 * Hazard severity enum — matches DB: hazard_severity
 */
export const HazardSeverity = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type HazardSeverity = (typeof HazardSeverity)[keyof typeof HazardSeverity];

export const HazardSeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);

export const HazardSeverityLabels: Record<HazardSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const HazardSeverityColors: Record<HazardSeverity, string> = {
  critical: '#d43050',
  high: '#e8a020',
  medium: '#3b82f6',
  low: '#6b7280',
};

/**
 * Hazard status enum — matches DB: hazard_status
 */
export const HazardStatus = {
  ACTIVE: 'active',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
} as const;

export type HazardStatus = (typeof HazardStatus)[keyof typeof HazardStatus];

export const HazardStatusSchema = z.enum([
  'active',
  'acknowledged',
  'resolved',
  'dismissed',
]);

export const HazardStatusLabels: Record<HazardStatus, string> = {
  active: 'Active',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

/**
 * Review outcome enum — matches DB: review_outcome
 */
export const ReviewOutcome = {
  CONFIRMED: 'confirmed',
  FALSE_POSITIVE: 'false_positive',
  NEEDS_TRAINING: 'needs_training',
} as const;

export type ReviewOutcome = (typeof ReviewOutcome)[keyof typeof ReviewOutcome];

export const ReviewOutcomeSchema = z.enum([
  'confirmed',
  'false_positive',
  'needs_training',
]);

export const ReviewOutcomeLabels: Record<ReviewOutcome, string> = {
  confirmed: 'Confirmed',
  false_positive: 'False Positive',
  needs_training: 'Needs Training',
};
