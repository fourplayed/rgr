/**
 * FleetAnalysis — daily AI-generated fleet status insight
 */
export interface FleetAnalysis {
  id: string;
  analysisDate: string;
  content: string;
  inputData: Record<string, unknown>;
  status: 'success' | 'failed';
  createdAt: string;
}

/**
 * UserActionSummary — aggregated 24h activity counts for a user
 */
export interface UserActionSummary {
  scansPerformed: number;
  defectsReported: number;
  maintenanceReported: number;
  maintenanceCompleted: number;
}
