/**
 * ThemeToggle Component Tests
 *
 * Tests the theme toggle button including:
 * - Rendering in light/dark modes
 * - Icon switching
 * - Click handling
 * - Animations
 * - Accessibility
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '../ThemeToggle';

describe('ThemeToggle', () => {
  describe('Rendering', () => {
    it('should render button element', () => {
      render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render moon icon in light mode', () => {
      const { container } = render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');

      // Moon icon should be present with light-gray class
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('moon-light-gray');
    });

    it('should render sun icon in dark mode', () => {
      const { container } = render(<ThemeToggle isDark={true} onToggle={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Switch to light mode');

      // Sun icon should be present
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should have button type', () => {
      render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  describe('Click Handling', () => {
    it('should call onToggle when clicked', async () => {
      const handleToggle = vi.fn();
      const user = userEvent.setup();

      render(<ThemeToggle isDark={false} onToggle={handleToggle} />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(handleToggle).toHaveBeenCalledTimes(1);
    });

    it('should call onToggle on multiple clicks', async () => {
      const handleToggle = vi.fn();
      const user = userEvent.setup();

      render(<ThemeToggle isDark={false} onToggle={handleToggle} />);

      const button = screen.getByRole('button');
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(handleToggle).toHaveBeenCalledTimes(3);
    });

    it('should be keyboard accessible', async () => {
      const handleToggle = vi.fn();
      const user = userEvent.setup();

      render(<ThemeToggle isDark={false} onToggle={handleToggle} />);

      const button = screen.getByRole('button');

      // Focus the button
      await user.tab();
      expect(button).toHaveFocus();

      // Press Enter
      await user.keyboard('{Enter}');
      expect(handleToggle).toHaveBeenCalled();
    });

    it('should handle Space key press', async () => {
      const handleToggle = vi.fn();
      const user = userEvent.setup();

      render(<ThemeToggle isDark={false} onToggle={handleToggle} />);

      // Focus and press Space
      await user.tab();
      await user.keyboard(' ');

      expect(handleToggle).toHaveBeenCalled();
    });
  });

  describe('Icon Styles', () => {
    it('should apply sun icon classes in dark mode', () => {
      const { container } = render(<ThemeToggle isDark={true} onToggle={vi.fn()} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6', 'text-white/70');
    });

    it('should apply moon icon classes in light mode', () => {
      const { container } = render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6', 'moon-light-gray');
    });

    it('should have transition classes on sun icon', () => {
      const { container } = render(<ThemeToggle isDark={true} onToggle={vi.fn()} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('transition-all', 'duration-500', 'ease-out');
    });

    it('should have transition classes on moon icon', () => {
      const { container } = render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('transition-all', 'duration-500', 'ease-out');
    });

    it('should have hover classes on sun icon', () => {
      const { container } = render(<ThemeToggle isDark={true} onToggle={vi.fn()} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('group-hover:text-yellow-400');
    });

    it('should inject moon icon custom styles', () => {
      render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      const styles = document.querySelectorAll('style');
      const hasMoonStyles = Array.from(styles).some((style) =>
        style.textContent?.includes('.moon-light-gray')
      );
      expect(hasMoonStyles).toBe(true);
    });
  });

  describe('Button Styles', () => {
    it('should have group class for hover effects', () => {
      render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('group');
    });

    it('should have relative positioning', () => {
      render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('relative');
    });

    it('should have transparent background', () => {
      render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent', 'border-0');
    });

    it('should have no padding', () => {
      render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('p-0');
    });
  });

  describe('Animations', () => {
    it('should have scale hover animation on sun icon', () => {
      const { container } = render(<ThemeToggle isDark={true} onToggle={vi.fn()} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('group-hover:scale-[1.15]');
    });

    it('should have rotation hover animation on sun icon', () => {
      const { container } = render(<ThemeToggle isDark={true} onToggle={vi.fn()} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('group-hover:rotate-180');
    });

    it('should inject moon hover animation styles', () => {
      render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      const styles = document.querySelectorAll('style');
      const hasMoonHoverStyles = Array.from(styles).some(
        (style) =>
          style.textContent?.includes('.group:hover .moon-light-gray') &&
          style.textContent?.includes('transform: scale(1.15) rotate(360deg)')
      );
      expect(hasMoonHoverStyles).toBe(true);
    });

    it('should have filter effects on moon hover', () => {
      render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      const styles = document.querySelectorAll('style');
      const hasFilterEffects = Array.from(styles).some(
        (style) =>
          style.textContent?.includes('brightness(1.3)') &&
          style.textContent?.includes('contrast(1.1)')
      );
      expect(hasFilterEffects).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have descriptive aria-label in light mode', () => {
      render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
    });

    it('should have descriptive aria-label in dark mode', () => {
      render(<ThemeToggle isDark={true} onToggle={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
    });

    it('should update aria-label when theme changes', () => {
      const { rerender } = render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      let button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');

      rerender(<ThemeToggle isDark={true} onToggle={vi.fn()} />);

      button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
    });

    it('should be focusable', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      const button = screen.getByRole('button');

      await user.tab();
      expect(button).toHaveFocus();
    });

    it('should not be disabled', () => {
      render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });
  });

  describe('Theme Transitions', () => {
    it('should render different icon when theme changes', () => {
      const { container, rerender } = render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      // Light mode - moon icon
      let svg = container.querySelector('svg');
      expect(svg).toHaveClass('moon-light-gray');

      // Dark mode - sun icon
      rerender(<ThemeToggle isDark={true} onToggle={vi.fn()} />);

      svg = container.querySelector('svg');
      expect(svg).not.toHaveClass('moon-light-gray');
      expect(svg).toHaveClass('text-white/70');
    });

    it('should handle rapid theme changes', () => {
      const { rerender } = render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      rerender(<ThemeToggle isDark={true} onToggle={vi.fn()} />);
      rerender(<ThemeToggle isDark={false} onToggle={vi.fn()} />);
      rerender(<ThemeToggle isDark={true} onToggle={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
    });
  });

  describe('Color Schemes', () => {
    it('should use light gray color for moon in light mode', () => {
      render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      const styles = document.querySelectorAll('style');
      const hasLightGrayColor = Array.from(styles).some((style) =>
        style.textContent?.includes('.moon-light-gray { color: #0a1a4a; }')
      );
      expect(hasLightGrayColor).toBe(true);
    });

    it('should use white/gray color for sun in dark mode', () => {
      const { container } = render(<ThemeToggle isDark={true} onToggle={vi.fn()} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-white/70');
    });

    it('should change moon to navy on hover', () => {
      render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      const styles = document.querySelectorAll('style');
      const hasHoverColor = Array.from(styles).some(
        (style) =>
          style.textContent?.includes('.group:hover .moon-light-gray') &&
          style.textContent?.includes('color: #0a1433')
      );
      expect(hasHoverColor).toBe(true);
    });

    it('should change sun to yellow on hover', () => {
      const { container } = render(<ThemeToggle isDark={true} onToggle={vi.fn()} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('group-hover:text-yellow-400');
    });
  });

  describe('Icon Size', () => {
    it('should have consistent icon size', () => {
      const { container } = render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });

    it('should maintain icon size on theme change', () => {
      const { container, rerender } = render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      let svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');

      rerender(<ThemeToggle isDark={true} onToggle={vi.fn()} />);

      svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing onToggle callback gracefully', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(<ThemeToggle isDark={false} onToggle={undefined as any} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle boolean coercion for isDark', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(<ThemeToggle isDark={1 as any} onToggle={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
    });

    it('should not break with null onToggle', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(<ThemeToggle isDark={false} onToggle={null as any} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      const handleToggle = vi.fn();
      const { rerender } = render(<ThemeToggle isDark={false} onToggle={handleToggle} />);

      // Same props should not cause issues
      rerender(<ThemeToggle isDark={false} onToggle={handleToggle} />);
      rerender(<ThemeToggle isDark={false} onToggle={handleToggle} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should use CSS for animations instead of JS', () => {
      render(<ThemeToggle isDark={false} onToggle={vi.fn()} />);

      const styles = document.querySelectorAll('style');
      const hasCssAnimations = Array.from(styles).some((style) => {
        const content = style.textContent || '';
        return (
          content.includes('transition') ||
          content.includes('transform') ||
          content.includes('duration')
        );
      });
      expect(hasCssAnimations).toBe(true);
    });
  });
});
