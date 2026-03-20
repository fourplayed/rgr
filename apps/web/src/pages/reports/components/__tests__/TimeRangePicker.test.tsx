/**
 * TimeRangePicker component tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeRangePicker } from '../TimeRangePicker';
import type { AnalyticsTimeRange } from '@/services/analyticsService';

describe('TimeRangePicker', () => {
  const onChange = vi.fn();
  beforeEach(() => onChange.mockClear());

  it('renders all four range buttons', () => {
    render(<TimeRangePicker value="30d" onChange={onChange} />);
    expect(screen.getByRole('button', { name: /7d/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /30d/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /90d/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1y/i })).toBeInTheDocument();
  });

  it('highlights the active range button', () => {
    render(<TimeRangePicker value="7d" onChange={onChange} />);
    const activeBtn = screen.getByRole('button', { name: /7d/i });
    const inactiveBtn = screen.getByRole('button', { name: /30d/i });
    // Active button should have aria-pressed true
    expect(activeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(inactiveBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with "7d" when 7d button is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TimeRangePicker value="30d" onChange={handleChange} />);
    await user.click(screen.getByRole('button', { name: /7d/i }));
    expect(handleChange).toHaveBeenCalledWith('7d');
  });

  it('calls onChange with "30d" when 30d button is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TimeRangePicker value="7d" onChange={handleChange} />);
    await user.click(screen.getByRole('button', { name: /30d/i }));
    expect(handleChange).toHaveBeenCalledWith('30d');
  });

  it('calls onChange with "90d" when 90d button is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TimeRangePicker value="7d" onChange={handleChange} />);
    await user.click(screen.getByRole('button', { name: /90d/i }));
    expect(handleChange).toHaveBeenCalledWith('90d');
  });

  it('calls onChange with "1y" when 1y button is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TimeRangePicker value="7d" onChange={handleChange} />);
    await user.click(screen.getByRole('button', { name: /1y/i }));
    expect(handleChange).toHaveBeenCalledWith('1y');
  });

  it('marks 1y as active when value is "1y"', () => {
    render(<TimeRangePicker value="1y" onChange={onChange} />);
    const activeBtn = screen.getByRole('button', { name: /1y/i });
    expect(activeBtn).toHaveAttribute('aria-pressed', 'true');
  });

  const ranges: AnalyticsTimeRange[] = ['7d', '30d', '90d', '1y'];
  ranges.forEach((range) => {
    it(`marks ${range} as active when value is "${range}"`, () => {
      render(<TimeRangePicker value={range} onChange={onChange} />);
      const activeBtn = screen.getByRole('button', { name: new RegExp(range, 'i') });
      expect(activeBtn).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
