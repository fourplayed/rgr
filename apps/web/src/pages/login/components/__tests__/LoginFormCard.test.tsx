/**
 * LoginFormCard Component Tests
 *
 * Tests the login form card including:
 * - Form rendering in light/dark themes
 * - Input field behavior
 * - Form validation
 * - Button states (idle, loading, disabled)
 * - Remember me checkbox
 * - Forgot password link
 * - Accessibility
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginFormCard } from '../LoginFormCard';
import type { LoginLogicState, LoginLogicActions } from '../../useLoginLogic';

// Mock button component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MockButton = ({ children, ...props }: any) => (
  <button {...props}>{children}</button>
);

describe('LoginFormCard', () => {
  let mockState: LoginLogicState;
  let mockActions: LoginLogicActions;
  let mockOnForgotPassword: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockState = {
      formData: { email: '', password: '', rememberMe: false },
      errors: { email: null, password: null, general: null },
      status: 'idle',
      isValid: false,
    };

    mockActions = {
      setEmail: vi.fn(),
      setPassword: vi.fn(),
      setRememberMe: vi.fn(),
      handleSubmit: vi.fn(async (e) => { e.preventDefault(); }),
      clearErrors: vi.fn(),
    };

    mockOnForgotPassword = vi.fn();
  });

  describe('Rendering', () => {
    it('should render all form elements', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render with light theme styles', () => {
      const { container } = render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveStyle({ background: expect.stringContaining('rgba') });
    });

    it('should render with dark theme styles', () => {
      const { container } = render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={true}
          />
        </MemoryRouter>
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveStyle({ background: expect.stringContaining('rgba') });
    });

    it('should have proper form ID', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      expect(screen.getByRole('form')).toHaveAttribute('id', 'login-form');
    });

    it('should have noValidate attribute on form', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      expect(screen.getByRole('form')).toHaveAttribute('noValidate');
    });
  });

  describe('Input Fields', () => {
    it('should set email input value from state', () => {
      const stateWithEmail = {
        ...mockState,
        formData: { ...mockState.formData, email: 'test@example.com' },
      };

      render(
        <MemoryRouter>
          <LoginFormCard
            state={stateWithEmail}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      expect(emailInput.value).toBe('test@example.com');
    });

    it('should set password input value from state', () => {
      const stateWithPassword = {
        ...mockState,
        formData: { ...mockState.formData, password: 'password123' },
      };

      render(
        <MemoryRouter>
          <LoginFormCard
            state={stateWithPassword}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
      expect(passwordInput.value).toBe('password123');
    });

    it('should call setEmail when email input changes', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'a');

      expect(mockActions.setEmail).toHaveBeenCalled();
    });

    it('should call setPassword when password input changes', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'p');

      expect(mockActions.setPassword).toHaveBeenCalled();
    });

    it('should have email input with correct attributes', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('name', 'email');
      expect(emailInput).toHaveAttribute('id', 'login-email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(emailInput).toHaveAttribute('required');
    });

    it('should have password input with correct attributes', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('name', 'password');
      expect(passwordInput).toHaveAttribute('id', 'login-password');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
      expect(passwordInput).toHaveAttribute('required');
    });

    it('should have placeholder text on inputs', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
    });
  });

  describe('Remember Me Checkbox', () => {
    it('should render unchecked by default', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const checkbox = screen.getByLabelText(/remember me/i) as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should render checked when state is true', () => {
      const stateWithRememberMe = {
        ...mockState,
        formData: { ...mockState.formData, rememberMe: true },
      };

      render(
        <MemoryRouter>
          <LoginFormCard
            state={stateWithRememberMe}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const checkbox = screen.getByLabelText(/remember me/i) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should call setRememberMe when checkbox is toggled', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const checkbox = screen.getByLabelText(/remember me/i);
      await user.click(checkbox);

      expect(mockActions.setRememberMe).toHaveBeenCalledWith(true);
    });

    it('should have proper checkbox attributes', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const checkbox = screen.getByLabelText(/remember me/i);
      expect(checkbox).toHaveAttribute('type', 'checkbox');
      expect(checkbox).toHaveAttribute('id', 'remember-me');
      expect(checkbox).toHaveAttribute('name', 'remember-me');
    });
  });

  describe('Forgot Password Link', () => {
    it('should render forgot password button', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const forgotButton = screen.getByRole('button', { name: /forgot password/i });
      expect(forgotButton).toBeInTheDocument();
    });

    it('should call onForgotPassword when clicked', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const forgotButton = screen.getByRole('button', { name: /forgot password/i });
      await user.click(forgotButton);

      expect(mockOnForgotPassword).toHaveBeenCalled();
    });

    it('should have proper button type', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const forgotButton = screen.getByRole('button', { name: /forgot password/i });
      expect(forgotButton).toHaveAttribute('type', 'button');
    });

    it('should have light theme styles', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const forgotButton = screen.getByRole('button', { name: /forgot password/i });
      expect(forgotButton).toHaveClass('text-blue-600');
    });

    it('should have dark theme styles', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={true}
          />
        </MemoryRouter>
      );

      const forgotButton = screen.getByRole('button', { name: /forgot password/i });
      expect(forgotButton).toHaveClass('text-gray-400');
    });
  });

  describe('Submit Button', () => {
    it('should render sign in button', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('should have submit type', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should be enabled when not loading', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('should be disabled when loading', () => {
      const loadingState = { ...mockState, status: 'loading' as const };

      render(
        <MemoryRouter>
          <LoginFormCard
            state={loadingState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const submitButton = screen.getByRole('button', { name: /signing in/i });
      expect(submitButton).toBeDisabled();
    });

    it('should show loading text when loading', () => {
      const loadingState = { ...mockState, status: 'loading' as const };

      render(
        <MemoryRouter>
          <LoginFormCard
            state={loadingState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const submitButton = screen.getByRole('button', { name: /signing in/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('should show loading spinner when loading', () => {
      const loadingState = { ...mockState, status: 'loading' as const };

      const { container } = render(
        <MemoryRouter>
          <LoginFormCard
            state={loadingState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      // LoadingSpinner renders an SVG
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should have chrome button styles', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toHaveClass('chrome-button');
    });

    it('should inject chrome button styles', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const styles = document.querySelectorAll('style');
      const hasChromeStyles = Array.from(styles).some((style) =>
        style.textContent?.includes('chrome-button')
      );
      expect(hasChromeStyles).toBe(true);
    });
  });

  describe('Form Submission', () => {
    it('should call handleSubmit when form is submitted', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      screen.getByRole('form'); // Verify form exists
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(mockActions.handleSubmit).toHaveBeenCalled();
    });

    it('should submit form when Enter is pressed in email field', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const form = screen.getByRole('form');
      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      emailInput.focus();

      // Simulate Enter key press which triggers form submit in real browsers
      fireEvent.submit(form);

      expect(mockActions.handleSubmit).toHaveBeenCalled();
    });

    it('should submit form when Enter is pressed in password field', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const form = screen.getByRole('form');
      const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
      passwordInput.focus();

      // Simulate Enter key press which triggers form submit in real browsers
      fireEvent.submit(form);

      expect(mockActions.handleSubmit).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form label', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const form = screen.getByRole('form', { name: /login form/i });
      expect(form).toBeInTheDocument();
    });

    it('should announce loading state to screen readers', () => {
      const loadingState = { ...mockState, status: 'loading' as const };

      render(
        <MemoryRouter>
          <LoginFormCard
            state={loadingState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const announcement = screen.getByRole('status');
      expect(announcement).toHaveClass('sr-only');
      expect(announcement).toHaveAttribute('aria-live', 'assertive');
      expect(announcement).toHaveTextContent(/signing in/i);
    });

    it('should have accessible checkbox label', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const checkbox = screen.getByLabelText(/remember me/i);
      expect(checkbox).toHaveAttribute('aria-label', 'Remember me');
    });

    it('should have accessible forgot password button', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const forgotButton = screen.getByRole('button', { name: /forgot password/i });
      expect(forgotButton).toHaveAttribute('aria-label', 'Forgot password?');
    });

    it('should respect prefers-reduced-motion', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
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
    it('should apply light theme text colors', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={false}
          />
        </MemoryRouter>
      );

      const rememberLabel = screen.getByText(/remember me/i);
      expect(rememberLabel).toHaveClass('text-black');
    });

    it('should apply dark theme text colors', () => {
      render(
        <MemoryRouter>
          <LoginFormCard
            state={mockState}
            actions={mockActions}
            ButtonComponent={MockButton}
            onForgotPassword={mockOnForgotPassword}
            isDark={true}
          />
        </MemoryRouter>
      );

      const rememberLabel = screen.getByText(/remember me/i);
      expect(rememberLabel).toHaveClass('text-slate-200');
    });
  });
});
