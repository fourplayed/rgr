import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Package } from 'lucide-react';
import { VisionStatCard, type GradientType } from '../VisionStatCard';

describe('VisionStatCard', () => {
  const defaultProps = {
    title: 'Total Assets',
    value: 125,
    icon: Package,
  };

  it('should render with basic props', () => {
    render(<VisionStatCard {...defaultProps} />);

    expect(screen.getByRole('article', { name: /Total Assets: 125/i })).toBeInTheDocument();
    expect(screen.getByText('Total Assets')).toBeInTheDocument();
    expect(screen.getByText('125')).toBeInTheDocument();
  });

  it('should display subtitle when provided', () => {
    render(<VisionStatCard {...defaultProps} subtitle="Active fleet items" />);

    expect(screen.getByText('Active fleet items')).toBeInTheDocument();
  });

  it('should display change with correct color when positive', () => {
    render(
      <VisionStatCard
        {...defaultProps}
        change={{ value: 12, label: 'this month' }}
      />
    );

    // Arrow and percentage are in separate spans
    expect(screen.getByText('▲')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
    // Check the arrow color (solid green #22c55e = rgb(34, 197, 94))
    const arrowElement = screen.getByText('▲');
    expect(arrowElement).toHaveStyle({ color: 'rgb(34, 197, 94)' });
    expect(screen.getByText('this month')).toBeInTheDocument();
  });

  it('should display change with correct color when negative', () => {
    render(
      <VisionStatCard
        {...defaultProps}
        change={{ value: -8, label: 'this week' }}
      />
    );

    // Arrow and percentage are in separate spans
    expect(screen.getByText('▼')).toBeInTheDocument();
    expect(screen.getByText('8%')).toBeInTheDocument();
    // Check the arrow color (solid red #dc2626 = rgb(220, 38, 38))
    const arrowElement = screen.getByText('▼');
    expect(arrowElement).toHaveStyle({ color: 'rgb(220, 38, 38)' });
  });

  it('should invert change colors when invertColors is true', () => {
    render(
      <VisionStatCard
        {...defaultProps}
        change={{ value: 12, label: 'this month' }}
        invertColors={true}
      />
    );

    // Check the arrow color - red for positive increase (bad) (solid red #dc2626 = rgb(220, 38, 38))
    const arrowElement = screen.getByText('▲');
    expect(arrowElement).toHaveStyle({ color: 'rgb(220, 38, 38)' });
  });

  it('should invert change colors when decrease is good', () => {
    render(
      <VisionStatCard
        {...defaultProps}
        change={{ value: -8, label: 'this week' }}
        invertColors={true}
      />
    );

    // Check the arrow color - green for negative decrease (good) (solid green #22c55e = rgb(34, 197, 94))
    const arrowElement = screen.getByText('▼');
    expect(arrowElement).toHaveStyle({ color: 'rgb(34, 197, 94)' });
  });

  it('should display metric when provided', () => {
    render(
      <VisionStatCard
        {...defaultProps}
        metric={{ text: '98.5%', label: 'uptime' }}
      />
    );

    expect(screen.getByText('98.5%')).toBeInTheDocument();
    expect(screen.getByText('uptime')).toBeInTheDocument();
  });

  it('should apply different gradient types', () => {
    const gradients: GradientType[] = ['info', 'success', 'warning', 'error', 'brand'];

    gradients.forEach((gradient) => {
      const { container, unmount } = render(
        <VisionStatCard {...defaultProps} gradient={gradient} />
      );

      const cardContent = container.querySelector('.stat-card-content');
      expect(cardContent).toBeInTheDocument();

      unmount();
    });
  });

  it('should apply custom className', () => {
    const { container } = render(
      <VisionStatCard {...defaultProps} className="custom-class" />
    );

    const cardWrapper = container.firstChild;
    expect(cardWrapper).toHaveClass('custom-class');
  });

  it('should trigger spin animation on mouse enter', async () => {
    const user = userEvent.setup();
    const { container } = render(<VisionStatCard {...defaultProps} />);

    const cardContent = container.querySelector('.stat-card-content');
    expect(cardContent).not.toHaveClass('spinning-widget');

    await user.hover(cardContent!);

    expect(cardContent).toHaveClass('spinning-widget');
  });

  it('should render icon component', () => {
    const { container } = render(<VisionStatCard {...defaultProps} />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should display string value', () => {
    render(<VisionStatCard {...defaultProps} value="142" />);

    expect(screen.getByText('142')).toBeInTheDocument();
  });

  it('should display numeric value', () => {
    render(<VisionStatCard {...defaultProps} value={99} />);

    expect(screen.getByText('99')).toBeInTheDocument();
  });

  it('should use dark theme by default', () => {
    const { container } = render(<VisionStatCard {...defaultProps} />);

    const cardContent = container.querySelector('.stat-card-content');
    expect(cardContent).toBeInTheDocument();
    // Dark theme uses drop-shadow-sm class
    const icon = container.querySelector('svg');
    expect(icon).toHaveClass('drop-shadow-sm');
  });

  it('should apply light theme styling when isDark is false', () => {
    const { container } = render(<VisionStatCard {...defaultProps} isDark={false} />);

    const cardContent = container.querySelector('.stat-card-content');
    expect(cardContent).toBeInTheDocument();
    // Component renders with solid background color
    expect(cardContent).toHaveStyle({ backgroundColor: 'rgb(8, 145, 178)' }); // cyan-600
  });

  it('should render with aria-label for accessibility', () => {
    render(<VisionStatCard title="Active Scans" value={42} icon={Package} />);

    const article = screen.getByRole('article', { name: /Active Scans: 42/i });
    expect(article).toHaveAttribute('aria-label', 'Active Scans: 42');
  });

  it('should memoize component correctly', () => {
    const { rerender } = render(<VisionStatCard {...defaultProps} />);

    // Re-render with same props
    rerender(<VisionStatCard {...defaultProps} />);

    // Component should not re-render (memoization)
    expect(screen.getByText('Total Assets')).toBeInTheDocument();
  });

  it('should re-render when value changes', () => {
    const { rerender } = render(<VisionStatCard {...defaultProps} />);

    expect(screen.getByText('125')).toBeInTheDocument();

    rerender(<VisionStatCard {...defaultProps} value={150} />);

    expect(screen.queryByText('125')).not.toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('should display zero value correctly', () => {
    render(<VisionStatCard {...defaultProps} value={0} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should display zero change correctly', () => {
    render(
      <VisionStatCard
        {...defaultProps}
        change={{ value: 0, label: 'no change' }}
      />
    );

    // Arrow and percentage are in separate spans
    expect(screen.getByText('▲')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('no change')).toBeInTheDocument();
  });

  it('should truncate long subtitles', () => {
    const longSubtitle = 'This is a very long subtitle that should be truncated when it exceeds two lines of text';

    render(
      <VisionStatCard {...defaultProps} subtitle={longSubtitle} />
    );

    const subtitleElement = screen.getByText(longSubtitle);
    expect(subtitleElement).toHaveClass('line-clamp-1');
  });

  it('should not crash with undefined change', () => {
    expect(() => {
      render(<VisionStatCard {...defaultProps} change={undefined} />);
    }).not.toThrow();
  });

  it('should not crash with undefined metric', () => {
    expect(() => {
      render(<VisionStatCard {...defaultProps} metric={undefined} />);
    }).not.toThrow();
  });

  it('should handle rapid hover interactions', async () => {
    const user = userEvent.setup();
    const { container } = render(<VisionStatCard {...defaultProps} />);

    const cardContent = container.querySelector('.stat-card-content');

    // Rapid hovers
    await user.hover(cardContent!);
    await user.hover(cardContent!);
    await user.hover(cardContent!);

    // Should only trigger animation once
    expect(cardContent).toHaveClass('spinning-widget');
  });
});
