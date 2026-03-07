/**
 * ThemedInput Component Tests
 *
 * Tests the themed input component including:
 * - Rendering in light/dark themes
 * - Input attributes and behavior
 * - Focus states
 * - Label association
 * - Accessibility
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemedInput } from '../ThemedInput';

describe('ThemedInput', () => {
  describe('Rendering', () => {
    it('should render input element', () => {
      render(<ThemedInput name="test" isDark={false} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<ThemedInput name="test" label="Test Label" isDark={false} />);

      expect(screen.getByLabelText(/test label/i)).toBeInTheDocument();
      expect(screen.getByText(/test label/i)).toBeInTheDocument();
    });

    it('should render without label', () => {
      render(<ThemedInput name="test" isDark={false} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(screen.queryByText(/label/i)).not.toBeInTheDocument();
    });

    it('should apply light theme styles', () => {
      render(<ThemedInput name="test" isDark={false} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('themed-input');
      expect(input).not.toHaveClass('themed-input-dark');
    });

    it('should apply dark theme styles', () => {
      render(<ThemedInput name="test" isDark={true} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('themed-input-dark');
      expect(input).toHaveClass('themed-input');
    });

    it('should inject focus styles', () => {
      render(<ThemedInput name="test" isDark={false} />);

      const styles = document.querySelectorAll('style');
      const hasFocusStyles = Array.from(styles).some(
        (style) =>
          style.textContent?.includes('.themed-input-light:focus') ||
          style.textContent?.includes('.themed-input-dark:focus')
      );
      expect(hasFocusStyles).toBe(true);
    });
  });

  describe('Input Attributes', () => {
    it('should use id prop when provided', () => {
      render(<ThemedInput id="custom-id" name="test" isDark={false} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'custom-id');
    });

    it('should fallback to name as id when id not provided', () => {
      render(<ThemedInput name="test-name" isDark={false} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'test-name');
    });

    it('should set name attribute', () => {
      render(<ThemedInput name="email" isDark={false} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('name', 'email');
    });

    it('should accept type prop', () => {
      render(<ThemedInput name="password" type="password" isDark={false} />);

      const input = document.querySelector('input[type="password"]');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should accept placeholder prop', () => {
      render(<ThemedInput name="test" placeholder="Enter text" isDark={false} />);

      const input = screen.getByPlaceholderText(/enter text/i);
      expect(input).toBeInTheDocument();
    });

    it('should accept required prop', () => {
      render(<ThemedInput name="test" required isDark={false} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('required');
    });

    it('should accept disabled prop', () => {
      render(<ThemedInput name="test" disabled isDark={false} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should accept autoComplete prop', () => {
      render(<ThemedInput name="email" autoComplete="email" isDark={false} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('autoComplete', 'email');
    });

    it('should accept value prop', () => {
      render(<ThemedInput name="test" value="test value" onChange={() => {}} isDark={false} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('test value');
    });
  });

  describe('Label Association', () => {
    it('should associate label with input using htmlFor', () => {
      render(<ThemedInput id="test-input" name="test" label="Test Label" isDark={false} />);

      const label = screen.getByText(/test label/i);
      expect(label).toHaveAttribute('for', 'test-input');
    });

    it('should use name as htmlFor when id not provided', () => {
      render(<ThemedInput name="test-name" label="Test Label" isDark={false} />);

      const label = screen.getByText(/test label/i);
      expect(label).toHaveAttribute('for', 'test-name');
    });

    it('should allow clicking label to focus input', async () => {
      const user = userEvent.setup();
      render(<ThemedInput name="test" label="Test Label" isDark={false} />);

      const label = screen.getByText(/test label/i);
      await user.click(label);

      const input = screen.getByRole('textbox');
      expect(input).toHaveFocus();
    });
  });

  describe('Input Behavior', () => {
    it('should call onChange handler when input changes', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<ThemedInput name="test" onChange={handleChange} isDark={false} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'a');

      expect(handleChange).toHaveBeenCalled();
    });

    it('should accept user input', async () => {
      const user = userEvent.setup();
      render(<ThemedInput name="test" isDark={false} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'test input');

      expect(input.value).toBe('test input');
    });

    it('should support controlled component pattern', async () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <ThemedInput name="test" value="" onChange={handleChange} isDark={false} />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('');

      rerender(
        <ThemedInput name="test" value="new value" onChange={handleChange} isDark={false} />
      );
      expect(input.value).toBe('new value');
    });

    it('should clear input when value is set to empty string', () => {
      const { rerender } = render(
        <ThemedInput name="test" value="initial" onChange={() => {}} isDark={false} />
      );

      let input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('initial');

      rerender(<ThemedInput name="test" value="" onChange={() => {}} isDark={false} />);
      input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });

  describe('Focus States', () => {
    it('should apply focus styles when focused', async () => {
      const user = userEvent.setup();
      render(<ThemedInput name="test" isDark={false} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(input).toHaveFocus();
    });

    it('should have focus outline', () => {
      render(<ThemedInput name="test" isDark={false} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('focus:outline-none');
    });

    it('should have transition on focus', () => {
      render(<ThemedInput name="test" isDark={false} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('transition-all', 'duration-200');
    });
  });

  describe('Theme Variations', () => {
    it('should apply light theme text color', () => {
      render(<ThemedInput name="test" isDark={false} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('text-slate-900');
    });

    it('should apply dark theme text color', () => {
      render(<ThemedInput name="test" isDark={true} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('text-white');
    });

    it('should apply light theme label color', () => {
      render(<ThemedInput name="test" label="Test Label" isDark={false} />);

      const label = screen.getByText(/test label/i);
      expect(label).toHaveClass('text-white');
    });

    it('should apply dark theme label color', () => {
      render(<ThemedInput name="test" label="Test Label" isDark={true} />);

      const label = screen.getByText(/test label/i);
      expect(label).toHaveClass('text-slate-200');
    });

    it('should apply placeholder color for both themes', () => {
      render(<ThemedInput name="test" isDark={false} />);

      const input = screen.getByRole('textbox');
      // Light theme uses white, dark theme uses gray-500
      expect(input).toHaveClass('placeholder:text-white');
    });

    it('should apply light theme focus background', () => {
      render(<ThemedInput name="test" isDark={false} />);

      const styles = document.querySelectorAll('style');
      const hasFocusBg = Array.from(styles).some((style) =>
        style.textContent?.includes('background-color: rgba(209, 213, 219, 0.3)')
      );
      expect(hasFocusBg).toBe(true);
    });

    it('should apply dark theme focus background', () => {
      render(<ThemedInput name="test" isDark={true} />);

      const styles = document.querySelectorAll('style');
      const hasFocusBg = Array.from(styles).some((style) =>
        style.textContent?.includes('background-color: rgba(0, 0, 0, 0.15)')
      );
      expect(hasFocusBg).toBe(true);
    });
  });

  describe('Styling', () => {
    it('should apply base input classes', () => {
      render(<ThemedInput name="test" isDark={false} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass(
        'w-full',
        'px-4',
        'py-3',
        'rounded-lg',
        'focus:outline-none',
        'transition-all',
        'duration-200'
      );
    });

    it('should apply label font classes', () => {
      render(<ThemedInput name="test" label="Test Label" isDark={false} />);

      const label = screen.getByText(/test label/i);
      expect(label).toHaveClass('block', 'text-sm', 'font-medium');
    });

    it('should have spacing between label and input', () => {
      const { container } = render(<ThemedInput name="test" label="Test Label" isDark={false} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('space-y-1');
    });
  });

  describe('Error Handling', () => {
    it('should ignore error prop (errors shown below card)', () => {
      render(<ThemedInput name="test" error="Test error" isDark={false} />);

      // Error should not be displayed
      expect(screen.queryByText(/test error/i)).not.toBeInTheDocument();
    });

    it('should not apply error styles', () => {
      render(<ThemedInput name="test" error="Test error" isDark={false} />);

      const input = screen.getByRole('textbox');
      // Should not have any error-related classes
      expect(input.className).not.toMatch(/error|invalid|danger/i);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible name via label', () => {
      render(<ThemedInput name="test" label="Email Address" isDark={false} />);

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    it('should support aria attributes', () => {
      render(
        <ThemedInput
          name="test"
          isDark={false}
          aria-describedby="test-description"
          aria-required="true"
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-description');
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('should indicate required fields', () => {
      render(<ThemedInput name="test" label="Required Field" required isDark={false} />);

      const input = screen.getByLabelText(/required field/i);
      expect(input).toHaveAttribute('required');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ThemedInput name="field1" isDark={false} />
          <ThemedInput name="field2" isDark={false} />
        </>
      );

      const inputs = screen.getAllByRole('textbox');

      // Tab to first input
      await user.tab();
      expect(inputs[0]).toHaveFocus();

      // Tab to second input
      await user.tab();
      expect(inputs[1]).toHaveFocus();
    });
  });

  describe('Email Input Type', () => {
    it('should render email input with correct type', () => {
      render(<ThemedInput name="email" type="email" isDark={false} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should accept email autocomplete', () => {
      render(<ThemedInput name="email" type="email" autoComplete="email" isDark={false} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('autoComplete', 'email');
    });
  });

  describe('Password Input Type', () => {
    it('should render password input with correct type', () => {
      render(<ThemedInput name="password" type="password" isDark={false} />);

      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('name', 'password');
    });

    it('should accept password autocomplete', () => {
      render(
        <ThemedInput
          name="password"
          type="password"
          autoComplete="current-password"
          isDark={false}
        />
      );

      const input = document.querySelector('input[type="password"]');
      expect(input).toHaveAttribute('autoComplete', 'current-password');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty name prop', () => {
      render(<ThemedInput name="" isDark={false} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should handle very long label text', () => {
      const longLabel =
        'This is a very long label that might wrap to multiple lines and should still be properly associated with the input';
      render(<ThemedInput name="test" label={longLabel} isDark={false} />);

      expect(screen.getByLabelText(longLabel)).toBeInTheDocument();
    });

    it('should handle rapid theme changes', () => {
      const { rerender } = render(<ThemedInput name="test" isDark={false} />);

      rerender(<ThemedInput name="test" isDark={true} />);
      rerender(<ThemedInput name="test" isDark={false} />);
      rerender(<ThemedInput name="test" isDark={true} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('themed-input-dark');
    });
  });
});
