/**
 * FleetHealthScore — container component.
 *
 * Fetches fleet health score and depot health scores, then delegates
 * all rendering to FleetHealthScorePresenter.
 */
import React from 'react';
import { useFleetHealthScore, useDepotHealthScores } from '@/hooks/useHealthScore';
import { FleetHealthScorePresenter } from './FleetHealthScorePresenter';

export interface FleetHealthScoreProps {
  onNavigateToReports: () => void;
}

export const FleetHealthScore: React.FC<FleetHealthScoreProps> = ({ onNavigateToReports }) => {
  const { data, isLoading: scoreLoading } = useFleetHealthScore();
  const { data: depotScores, isLoading: depotLoading } = useDepotHealthScores();

  const isLoading = scoreLoading || depotLoading;

  return (
    <FleetHealthScorePresenter
      data={data}
      depotScores={depotScores}
      isLoading={isLoading}
      onNavigateToReports={onNavigateToReports}
    />
  );
};

export default FleetHealthScore;
