/**
 * ForgotPasswordCard Component Tests
 *
 * Tests the forgot password card including:
 * - Form rendering in light/dark themes
 * - Email validation
 * - Form submission
 * - Success state
 * - Error handling
 * - XSS sanitization
 * - Accessibility
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForgotPasswordCard } from '../ForgotPasswordCard';

// Mock button component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MockButton = ({ children, onClick, ...props }: any) => (
  <button onClick={onClick} {...props}>
    {children}
  </button>
);

describe('ForgotPasswordCard', () => {
  let mockOnBack: ReturnType<typeof vi.fn>;
  let mockOnError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnBack = vi.fn();
    mockOnError = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render forgot password form', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send email/i })).toBeInTheDocument();
    });

    it('should render with light theme styles', () => {
      const { container } = render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveStyle({ background: expect.stringContaining('rgba') });
    });

    it('should render with dark theme styles', () => {
      const { container } = render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={true}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveStyle({ background: expect.stringContaining('rgba') });
    });

    it('should render title and subtitle', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
      expect(screen.getByText(/no worries! we can reset it for you/i)).toBeInTheDocument();
    });

    it('should render back to login button', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      // Button has aria-label "Return to login form" and text "Back to login"
      const backButton = screen.getByText(/back to login/i);
      expect(backButton).toBeInTheDocument();
    });
  });

  describe('Email Input', () => {
    it('should render email input field', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('name', 'email');
      expect(emailInput).toHaveAttribute('id', 'reset-email');
      expect(emailInput).toHaveAttribute('required');
    });

    it('should accept email input', async () => {
      vi.useRealTimers(); // Use real timers for userEvent
      const user = userEvent.setup({ delay: null });
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');

      expect(emailInput.value).toBe('test@example.com');
      vi.useFakeTimers(); // Restore fake timers for next test
    });

    it('should have placeholder text', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      expect(emailInput).toBeInTheDocument();
    });

    it('should have autocomplete attribute', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty email', async () => {
      vi.useRealTimers();
      const user = userEvent.setup({ delay: null });
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const submitButton = screen.getByRole('button', { name: /send email/i });
      await user.click(submitButton);

      expect(mockOnError).toHaveBeenCalledWith('Email is required');
      vi.useFakeTimers();
    });

    it('should show error for invalid email format', async () => {
      vi.useRealTimers();
      const user = userEvent.setup({ delay: null });
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /send email/i });
      await user.click(submitButton);

      expect(mockOnError).toHaveBeenCalledWith('Please enter a valid email address');
      vi.useFakeTimers();
    });

    it('should accept valid email format', async () => {
      vi.useRealTimers();
      const user = userEvent.setup({ delay: null });
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'valid@example.com');

      const submitButton = screen.getByRole('button', { name: /send email/i });
      await user.click(submitButton);

      // Should not call onError for valid email
      expect(mockOnError).toHaveBeenCalledWith(null);
      vi.useFakeTimers();
    });

    it('should have noValidate attribute on form', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      expect(screen.getByRole('form')).toHaveAttribute('noValidate');
    });
  });

  describe('XSS Sanitization', () => {
    it('should sanitize email input to prevent XSS', async () => {
      vi.useRealTimers();
      const user = userEvent.setup({ delay: null });
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, '<script>alert("xss")</script>@test.com');

      const submitButton = screen.getByRole('button', { name: /send email/i });
      await user.click(submitButton);

      // Input should be sanitized before validation
      const inputValue = (emailInput as HTMLInputElement).value;
      expect(inputValue).not.toContain('<script>');
      vi.useFakeTimers();
    });

    it('should remove HTML tags from email', async () => {
      vi.useRealTimers();
      const user = userEvent.setup({ delay: null });
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test<b>@example</b>.com');

      const submitButton = screen.getByRole('button', { name: /send email/i });
      await user.click(submitButton);

      const inputValue = (emailInput as HTMLInputElement).value;
      expect(inputValue).not.toContain('<b>');
      expect(inputValue).not.toContain('</b>');
      vi.useFakeTimers();
    });

    it('should remove javascript: protocol from input', async () => {
      vi.useRealTimers();
      const user = userEvent.setup({ delay: null });
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'javascript:alert(1)@test.com');

      const submitButton = screen.getByRole('button', { name: /send email/i });
      await user.click(submitButton);

      const inputValue = (emailInput as HTMLInputElement).value;
      expect(inputValue.toLowerCase()).not.toContain('javascript:');
      vi.useFakeTimers();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid email', async () => {
      vi.useRealTimers();
      const user = userEvent.setup({ delay: null });
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send email/i });
      await user.click(submitButton);

      // Should clear errors and start loading
      expect(mockOnError).toHaveBeenCalledWith(null);
      vi.useFakeTimers();
    });

    it('should show loading state during submission', async () => {
      vi.useRealTimers();
      const user = userEvent.setup({ delay: null });
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send email/i });
      await user.click(submitButton);

      // Button should show loading state
      expect(screen.getByText(/sending/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      vi.useFakeTimers();
    });

    it('should show success message after submission', async () => {
      vi.useRealTimers();
      const user = userEvent.setup({ delay: null });
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send email/i });
      await user.click(submitButton);

      // Wait for async state updates with increased timeout
      await waitFor(
        () => {
          expect(screen.getByText(/check your email for a password reset link/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should disable input during loading', async () => {
      vi.useRealTimers();
      const user = userEvent.setup({ delay: null });
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send email/i });
      await user.click(submitButton);

      expect(emailInput).toBeDisabled();
      vi.useFakeTimers();
    });

    it('should disable back button during loading', async () => {
      vi.useRealTimers();
      const user = userEvent.setup({ delay: null });
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send email/i });
      await user.click(submitButton);

      const backButton = screen.getByRole('button', { name: /return to login form/i });
      expect(backButton).toBeDisabled();
      vi.useFakeTimers();
    });
  });

  describe('Success State', () => {
    it('should show success message after successful submission', async () => {
      vi.useRealTimers();
      const user = userEvent.setup({ delay: null });
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send email/i });
      await user.click(submitButton);

      await waitFor(
        () => {
          expect(screen.getByText(/check your email for a password reset link/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should show spam folder reminder in success state', async () => {
      vi.useRealTimers();
      const user = userEvent.setup({ delay: null });
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send email/i });
      await user.click(submitButton);

      await waitFor(
        () => {
          expect(screen.getByText(/check your spam folder/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should show back to login button in success state', async () => {
      vi.useRealTimers();
      const user = userEvent.setup({ delay: null });
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send email/i });
      await user.click(submitButton);

      await waitFor(
        () => {
          const backButton = screen.getByRole('button', { name: /back to login/i });
          expect(backButton).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should call onBack when back button is clicked in success state', async () => {
      vi.useRealTimers();
      const user = userEvent.setup({ delay: null });
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send email/i });
      await user.click(submitButton);

      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const backButton = screen.getByRole('button', { name: /back to login/i });
      await user.click(backButton);

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('Back Button', () => {
    it('should render back button with icon', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const backButton = screen.getByRole('button', { name: /return to login form/i });
      expect(backButton).toBeInTheDocument();

      // Should have left arrow SVG
      const svg = backButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should call onBack when clicked', async () => {
      vi.useRealTimers();
      const user = userEvent.setup({ delay: null });
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const backButton = screen.getByRole('button', { name: /return to login form/i });
      await user.click(backButton);

      expect(mockOnBack).toHaveBeenCalled();
    });

    it('should have proper button type', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const backButton = screen.getByRole('button', { name: /return to login form/i });
      expect(backButton).toHaveAttribute('type', 'button');
    });

    it('should have light theme styles', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const backButton = screen.getByRole('button', { name: /return to login form/i });
      expect(backButton).toHaveClass('text-blue-600');
    });

    it('should have dark theme styles', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={true}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const backButton = screen.getByRole('button', { name: /return to login form/i });
      expect(backButton).toHaveClass('text-gray-400');
    });
  });

  describe('Submit Button Styles', () => {
    it('should have chrome button styles', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const submitButton = screen.getByRole('button', { name: /send email/i });
      expect(submitButton).toHaveClass('chrome-button-forgot');
    });

    it('should inject chrome button styles', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const styles = document.querySelectorAll('style');
      const hasChromeStyles = Array.from(styles).some((style) =>
        style.textContent?.includes('chrome-button-forgot')
      );
      expect(hasChromeStyles).toBe(true);
    });

    it('should show animated mail icon when not loading', () => {
      const { container } = render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      // AnimatedMailIcon renders an SVG
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form ID', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      expect(screen.getByRole('form')).toHaveAttribute('id', 'forgot-password-form');
    });

    it('should have accessible back button', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const backButton = screen.getByRole('button', { name: /return to login form/i });
      expect(backButton).toHaveAttribute('aria-label', 'Return to login form');
    });

    it('should respect prefers-reduced-motion', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const styles = document.querySelectorAll('style');
      const hasReducedMotion = Array.from(styles).some((style) =>
        style.textContent?.includes('prefers-reduced-motion')
      );
      expect(hasReducedMotion).toBe(true);
    });
  });

  describe('Theme Variations', () => {
    it('should apply light theme title color', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const title = screen.getByText(/forgot your password/i);
      expect(title).toHaveClass('text-black');
    });

    it('should apply dark theme title color', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={true}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const title = screen.getByText(/forgot your password/i);
      expect(title).toHaveClass('text-white');
    });

    it('should apply light theme subtitle color', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={false}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const subtitle = screen.getByText(/no worries! we can reset it for you/i);
      expect(subtitle).toHaveClass('text-gray-600');
    });

    it('should apply dark theme subtitle color', () => {
      render(
        <MemoryRouter>
          <ForgotPasswordCard
            ButtonComponent={MockButton}
            onBack={mockOnBack}
            isDark={true}
            onError={mockOnError}
          />
        </MemoryRouter>
      );

      const subtitle = screen.getByText(/no worries! we can reset it for you/i);
      expect(subtitle).toHaveClass('text-slate-300');
    });
  });
});
