/**
 * FleetHealthScorePresenter component tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FleetHealthScorePresenter } from '../FleetHealthScorePresenter';
import type { HealthScoreData } from '@/hooks/useHealthScore';
import type { DepotHealthScoreData } from '@/hooks/useHealthScore';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  RadialBarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="radial-bar-chart">{children}</div>
  ),
  RadialBar: () => null,
  PolarAngleAxis: () => null,
}));

const healthyData: HealthScoreData = {
  overallScore: 95,
  scanCompliance: 97,
  hazardClearance: 95,
  maintenanceCurrency: 90,
  status: 'healthy',
};

const attentionData: HealthScoreData = {
  overallScore: 78,
  scanCompliance: 80,
  hazardClearance: 75,
  maintenanceCurrency: 82,
  status: 'attention',
};

const atRiskData: HealthScoreData = {
  overallScore: 55,
  scanCompliance: 50,
  hazardClearance: 60,
  maintenanceCurrency: 55,
  status: 'at_risk',
};

const depotScores: DepotHealthScoreData[] = [
  {
    depotId: 'depot-1',
    depotName: 'North Depot',
    scanCompliance: 90,
    hazardClearance: 85,
    maintenanceCurrency: 95,
    overallScore: 89,
  },
  {
    depotId: 'depot-2',
    depotName: 'South Depot',
    scanCompliance: 70,
    hazardClearance: 65,
    maintenanceCurrency: 80,
    overallScore: 70,
  },
];

const defaultProps = {
  data: healthyData,
  depotScores,
  isLoading: false,
  onNavigateToReports: vi.fn(),
};

describe('FleetHealthScorePresenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('shows skeleton when isLoading is true', () => {
      render(<FleetHealthScorePresenter {...defaultProps} isLoading={true} data={undefined} />);
      expect(screen.getByTestId('fleet-health-skeleton')).toBeInTheDocument();
    });

    it('does not render the score when loading', () => {
      render(<FleetHealthScorePresenter {...defaultProps} isLoading={true} data={undefined} />);
      expect(screen.queryByTestId('fleet-health-score-value')).not.toBeInTheDocument();
    });

    it('does not render the chart when loading', () => {
      render(<FleetHealthScorePresenter {...defaultProps} isLoading={true} data={undefined} />);
      expect(screen.queryByTestId('chart-container')).not.toBeInTheDocument();
    });
  });

  describe('Score display', () => {
    it('shows the overall score value for healthy status', () => {
      render(<FleetHealthScorePresenter {...defaultProps} data={healthyData} />);
      expect(screen.getByTestId('fleet-health-score-value')).toHaveTextContent('95');
    });

    it('shows the overall score for attention status', () => {
      render(<FleetHealthScorePresenter {...defaultProps} data={attentionData} />);
      expect(screen.getByTestId('fleet-health-score-value')).toHaveTextContent('78');
    });

    it('shows the overall score for at_risk status', () => {
      render(<FleetHealthScorePresenter {...defaultProps} data={atRiskData} />);
      expect(screen.getByTestId('fleet-health-score-value')).toHaveTextContent('55');
    });

    it('shows "—" when data is undefined and not loading', () => {
      render(<FleetHealthScorePresenter {...defaultProps} data={undefined} />);
      expect(screen.getByTestId('fleet-health-score-value')).toHaveTextContent('—');
    });
  });

  describe('Color coding', () => {
    it('applies green color class for healthy status', () => {
      render(<FleetHealthScorePresenter {...defaultProps} data={healthyData} />);
      const scoreEl = screen.getByTestId('fleet-health-score-value');
      expect(scoreEl.className).toMatch(/green/i);
    });

    it('applies amber color class for attention status', () => {
      render(<FleetHealthScorePresenter {...defaultProps} data={attentionData} />);
      const scoreEl = screen.getByTestId('fleet-health-score-value');
      expect(scoreEl.className).toMatch(/amber/i);
    });

    it('applies red color class for at_risk status', () => {
      render(<FleetHealthScorePresenter {...defaultProps} data={atRiskData} />);
      const scoreEl = screen.getByTestId('fleet-health-score-value');
      expect(scoreEl.className).toMatch(/red/i);
    });
  });

  describe('Header', () => {
    it('renders the Fleet Health title', () => {
      render(<FleetHealthScorePresenter {...defaultProps} />);
      expect(screen.getByText('Fleet Health')).toBeInTheDocument();
    });

    it('renders the View Reports link', () => {
      render(<FleetHealthScorePresenter {...defaultProps} />);
      expect(screen.getByTestId('view-reports-link')).toBeInTheDocument();
    });

    it('calls onNavigateToReports when View Reports is clicked', () => {
      const onNavigate = vi.fn();
      render(<FleetHealthScorePresenter {...defaultProps} onNavigateToReports={onNavigate} />);
      fireEvent.click(screen.getByTestId('view-reports-link'));
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Component scores', () => {
    it('shows scan compliance score', () => {
      render(<FleetHealthScorePresenter {...defaultProps} data={healthyData} />);
      expect(screen.getByText('Scan Compliance')).toBeInTheDocument();
      expect(screen.getByTestId('score-scan-compliance')).toHaveTextContent('97');
    });

    it('shows hazard clearance score', () => {
      render(<FleetHealthScorePresenter {...defaultProps} data={healthyData} />);
      expect(screen.getByText('Hazard Clearance')).toBeInTheDocument();
      expect(screen.getByTestId('score-hazard-clearance')).toHaveTextContent('95');
    });

    it('shows maintenance currency score', () => {
      render(<FleetHealthScorePresenter {...defaultProps} data={healthyData} />);
      expect(screen.getByText('Maintenance Currency')).toBeInTheDocument();
      expect(screen.getByTestId('score-maintenance-currency')).toHaveTextContent('90');
    });

    it('shows component scores section by default (not depot view)', () => {
      render(<FleetHealthScorePresenter {...defaultProps} />);
      expect(screen.getByTestId('component-scores')).toBeInTheDocument();
      expect(screen.queryByTestId('depot-scores')).not.toBeInTheDocument();
    });
  });

  describe('Depot toggle', () => {
    it('shows "By Depot" toggle button', () => {
      render(<FleetHealthScorePresenter {...defaultProps} />);
      expect(screen.getByTestId('by-depot-toggle')).toBeInTheDocument();
    });

    it('toggles to depot view when "By Depot" is clicked', () => {
      render(<FleetHealthScorePresenter {...defaultProps} />);
      fireEvent.click(screen.getByTestId('by-depot-toggle'));
      expect(screen.getByTestId('depot-scores')).toBeInTheDocument();
      expect(screen.queryByTestId('component-scores')).not.toBeInTheDocument();
    });

    it('shows depot names in depot view', () => {
      render(<FleetHealthScorePresenter {...defaultProps} />);
      fireEvent.click(screen.getByTestId('by-depot-toggle'));
      expect(screen.getByText('North Depot')).toBeInTheDocument();
      expect(screen.getByText('South Depot')).toBeInTheDocument();
    });

    it('shows depot scores in depot view', () => {
      render(<FleetHealthScorePresenter {...defaultProps} />);
      fireEvent.click(screen.getByTestId('by-depot-toggle'));
      expect(screen.getByTestId('depot-score-depot-1')).toHaveTextContent('89');
      expect(screen.getByTestId('depot-score-depot-2')).toHaveTextContent('70');
    });

    it('toggles back to component scores when clicked again', () => {
      render(<FleetHealthScorePresenter {...defaultProps} />);
      fireEvent.click(screen.getByTestId('by-depot-toggle'));
      fireEvent.click(screen.getByTestId('by-depot-toggle'));
      expect(screen.getByTestId('component-scores')).toBeInTheDocument();
      expect(screen.queryByTestId('depot-scores')).not.toBeInTheDocument();
    });

    it('shows empty depot state when depotScores is undefined', () => {
      render(<FleetHealthScorePresenter {...defaultProps} depotScores={undefined} />);
      fireEvent.click(screen.getByTestId('by-depot-toggle'));
      expect(screen.getByTestId('depot-scores')).toBeInTheDocument();
      // Should render an empty list with no depot rows
      expect(screen.queryByText('North Depot')).not.toBeInTheDocument();
    });
  });

  describe('Chart', () => {
    it('renders the radial bar chart for valid data', () => {
      render(<FleetHealthScorePresenter {...defaultProps} data={healthyData} />);
      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('renders the chart container even when data is undefined', () => {
      render(<FleetHealthScorePresenter {...defaultProps} data={undefined} />);
      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });
  });
});
