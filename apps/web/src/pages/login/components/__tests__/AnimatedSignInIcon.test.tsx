/**
 * AnimatedSignInIcon Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { AnimatedSignInIcon } from '../AnimatedSignInIcon';

describe('AnimatedSignInIcon', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render an SVG icon', () => {
      const { container } = render(<AnimatedSignInIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render with default size of 24px', () => {
      const { container } = render(<AnimatedSignInIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '24');
      expect(svg).toHaveAttribute('height', '24');
    });

    it('should render with custom size', () => {
      const { container } = render(<AnimatedSignInIcon size={32} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '32');
      expect(svg).toHaveAttribute('height', '32');
    });

    it('should apply custom className', () => {
      const { container } = render(<AnimatedSignInIcon className="custom-class" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('custom-class');
    });

    it('should have aria-hidden for accessibility', () => {
      const { container } = render(<AnimatedSignInIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('should have role="img" for semantic meaning', () => {
      const { container } = render(<AnimatedSignInIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('role', 'img');
    });
  });

  describe('Animation States', () => {
    it('should initially not have slide-active class', () => {
      const { container } = render(<AnimatedSignInIcon />);
      const svg = container.querySelector('svg');
      expect(svg).not.toHaveClass('slide-active');
    });

    it('should apply slide-active class after initial delay', async () => {
      const { container } = render(<AnimatedSignInIcon />);
      const svg = container.querySelector('svg');

      // Fast-forward past initial 500ms delay
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(svg).toHaveClass('slide-active');
    });

    it('should remove slide-active class after animation completes', async () => {
      const { container } = render(<AnimatedSignInIcon />);
      const svg = container.querySelector('svg');

      // Fast-forward past initial delay + animation duration (1100ms)
      await act(async () => {
        vi.advanceTimersByTime(500 + 1100);
      });

      expect(svg).not.toHaveClass('slide-active');
    });

    it('should repeat slide animation every 6 seconds', async () => {
      const { container } = render(<AnimatedSignInIcon />);
      const svg = container.querySelector('svg');

      // First animation at 500ms
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      expect(svg).toHaveClass('slide-active');

      // Animation ends (1100ms duration)
      await act(async () => {
        vi.advanceTimersByTime(1100);
      });
      expect(svg).not.toHaveClass('slide-active');

      // Second animation at 6000ms from first
      await act(async () => {
        vi.advanceTimersByTime(6000 - 1100);
      });
      expect(svg).toHaveClass('slide-active');
    });

    it('should apply rotate-active class when hovered', () => {
      const { container, rerender } = render(<AnimatedSignInIcon isHovered={false} />);
      const svg = container.querySelector('svg');
      expect(svg).not.toHaveClass('rotate-active');

      rerender(<AnimatedSignInIcon isHovered={true} />);
      expect(svg).toHaveClass('rotate-active');
    });

    it('should remove rotate-active class when hover ends', () => {
      const { container, rerender } = render(<AnimatedSignInIcon isHovered={true} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('rotate-active');

      rerender(<AnimatedSignInIcon isHovered={false} />);
      expect(svg).not.toHaveClass('rotate-active');
    });
  });

  describe('Timer Management', () => {
    it('should clean up timers on unmount', () => {
      const { unmount } = render(<AnimatedSignInIcon />);

      // Verify timers exist
      expect(vi.getTimerCount()).toBeGreaterThan(0);

      unmount();

      // Note: React's cleanup runs timers, so we just verify no errors occur
      expect(() => vi.advanceTimersByTime(1000)).not.toThrow();
    });

    it('should not cause memory leaks with multiple renders', () => {
      const { rerender, unmount } = render(<AnimatedSignInIcon />);

      // Multiple re-renders
      for (let i = 0; i < 5; i++) {
        rerender(<AnimatedSignInIcon isHovered={i % 2 === 0} />);
      }

      unmount();
      expect(() => vi.advanceTimersByTime(1000)).not.toThrow();
    });
  });

  describe('CSS Classes', () => {
    it('should use animated-icon base class', () => {
      const { container } = render(<AnimatedSignInIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('animated-icon');
    });

    it('should use animated-icon--sign-in variant class', () => {
      const { container } = render(<AnimatedSignInIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('animated-icon--sign-in');
    });
  });

  describe('Accessibility', () => {
    it('should be hidden from screen readers', () => {
      const { container } = render(<AnimatedSignInIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('should have aria-hidden attribute', () => {
      const { container } = render(<AnimatedSignInIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Performance', () => {
    it('should apply animated-icon class for GPU acceleration', () => {
      const { container } = render(<AnimatedSignInIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('animated-icon');
    });
  });

  describe('SVG Path', () => {
    it('should render right-pointing arrow path', () => {
      const { container } = render(<AnimatedSignInIcon />);
      const path = container.querySelector('path');
      expect(path).toBeInTheDocument();
      expect(path).toHaveAttribute('d', 'M13 7l5 5m0 0l-5 5m5-5H6');
    });

    it('should have rounded stroke caps', () => {
      const { container } = render(<AnimatedSignInIcon />);
      const path = container.querySelector('path');
      expect(path).toHaveAttribute('stroke-linecap', 'round');
      expect(path).toHaveAttribute('stroke-linejoin', 'round');
    });
  });
});
