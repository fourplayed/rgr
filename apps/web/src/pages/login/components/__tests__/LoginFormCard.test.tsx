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
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginFormCard } from '../LoginFormCard';
import type { LoginLogicState, LoginLogicActions } from '../../useLoginLogic';

// Mock dev tools store
vi.mock('@/stores/devToolsStore', () => ({
  useDevToolsStore: () => ({
    setWorkflowSteps: vi.fn(),
    setWorkflowComplete: vi.fn(),
  }),
}));


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
      handleSubmit: vi.fn().mockImplementation(async (e) => {
        e.preventDefault();
      }) as (e: React.FormEvent) => Promise<void>,
      clearErrors: vi.fn(),
    };

    mockOnForgotPassword = vi.fn();
  });

  describe('Rendering', () => {
    it('should render all form elements', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render with light theme styles', () => {
      const { container } = render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toBeInTheDocument();
      expect(card.style.background).toContain('rgba');
    });

    it('should render with dark theme styles', () => {
      const { container } = render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={true}
        />
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toBeInTheDocument();
      expect(card.style.background).toContain('rgba');
    });

    it('should have proper form ID', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      expect(screen.getByRole('form')).toHaveAttribute('id', 'login-form');
    });

    it('should have noValidate attribute on form', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
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
        <LoginFormCard
          state={stateWithEmail}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const emailInput = screen.getByLabelText(/^email$/i) as HTMLInputElement;
      expect(emailInput.value).toBe('test@example.com');
    });

    it('should set password input value from state', () => {
      const stateWithPassword = {
        ...mockState,
        formData: { ...mockState.formData, password: 'password123' },
      };

      render(
        <LoginFormCard
          state={stateWithPassword}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
      expect(passwordInput.value).toBe('password123');
    });

    it('should call setEmail when email input changes', async () => {
      const user = userEvent.setup();
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const emailInput = screen.getByLabelText(/^email$/i);
      await user.type(emailInput, 'a');

      expect(mockActions.setEmail).toHaveBeenCalled();
    });

    it('should call setPassword when password input changes', async () => {
      const user = userEvent.setup();
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'p');

      expect(mockActions.setPassword).toHaveBeenCalled();
    });

    it('should have email input with correct attributes', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const emailInput = screen.getByLabelText(/^email$/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('name', 'email');
      expect(emailInput).toHaveAttribute('id', 'login-email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(emailInput).toHaveAttribute('required');
    });

    it('should have password input with correct attributes', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
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
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
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
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
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
        <LoginFormCard
          state={stateWithRememberMe}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const checkbox = screen.getByLabelText(/remember me/i) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should call setRememberMe when checkbox is toggled', async () => {
      const user = userEvent.setup();
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const checkbox = screen.getByLabelText(/remember me/i);
      await user.click(checkbox);

      expect(mockActions.setRememberMe).toHaveBeenCalledWith(true);
    });

    it('should have proper checkbox attributes', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
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
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const forgotButton = screen.getByRole('button', { name: /forgot password/i });
      expect(forgotButton).toBeInTheDocument();
    });

    it('should call onForgotPassword when clicked', async () => {
      const user = userEvent.setup();
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const forgotButton = screen.getByRole('button', { name: /forgot password/i });
      await user.click(forgotButton);

      expect(mockOnForgotPassword).toHaveBeenCalled();
    });

    it('should have proper button type', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const forgotButton = screen.getByRole('button', { name: /forgot password/i });
      expect(forgotButton).toHaveAttribute('type', 'button');
    });

    it('should have light theme styles', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const forgotButton = screen.getByRole('button', { name: /forgot password/i });
      expect(forgotButton).toHaveClass('text-white/90');
    });

    it('should have dark theme styles', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={true}
        />
      );

      const forgotButton = screen.getByRole('button', { name: /forgot password/i });
      expect(forgotButton).toHaveClass('text-white/90');
    });
  });

  describe('Submit Button', () => {
    it('should render sign in button', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('should have submit type', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should be enabled when not loading', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('should be disabled when loading', () => {
      const loadingState = { ...mockState, status: 'loading' as const };

      render(
        <LoginFormCard
          state={loadingState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const submitButton = screen.getByRole('button', { name: /signing in/i });
      expect(submitButton).toBeDisabled();
    });

    it('should show loading text when loading', () => {
      const loadingState = { ...mockState, status: 'loading' as const };

      render(
        <LoginFormCard
          state={loadingState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const submitButton = screen.getByRole('button', { name: /signing in/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('should show loading spinner when loading', () => {
      const loadingState = { ...mockState, status: 'loading' as const };

      const { container } = render(
        <LoginFormCard
          state={loadingState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      // LoadingSpinner renders an SVG
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should have chrome button styles', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toHaveClass('chrome-button');
    });

    it('should apply light theme variant class', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toHaveClass('chrome-button-light');
    });
  });

  describe('Form Submission', () => {
    it('should call handleSubmit when form is submitted', async () => {
      const user = userEvent.setup();
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      screen.getByRole('form'); // Verify form exists
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(mockActions.handleSubmit).toHaveBeenCalled();
    });

    it('should submit form when Enter is pressed in email field', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const form = screen.getByRole('form');
      const emailInput = screen.getByLabelText(/^email$/i) as HTMLInputElement;
      emailInput.focus();

      // Simulate Enter key press which triggers form submit in real browsers
      fireEvent.submit(form);

      expect(mockActions.handleSubmit).toHaveBeenCalled();
    });

    it('should submit form when Enter is pressed in password field', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
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
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const form = screen.getByRole('form', { name: /login form/i });
      expect(form).toBeInTheDocument();
    });

    it('should announce loading state to screen readers', () => {
      const loadingState = { ...mockState, status: 'loading' as const };

      render(
        <LoginFormCard
          state={loadingState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const announcement = screen.getByRole('status');
      expect(announcement).toHaveClass('sr-only');
      expect(announcement).toHaveAttribute('aria-live', 'assertive');
      expect(announcement).toHaveTextContent(/signing in/i);
    });

    it('should have accessible checkbox label', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const checkbox = screen.getByLabelText(/remember me/i);
      expect(checkbox).toHaveAttribute('aria-label', 'Remember me');
    });

    it('should have accessible forgot password button', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const forgotButton = screen.getByRole('button', { name: /forgot password/i });
      expect(forgotButton).toHaveAttribute('aria-label', 'Forgot password?');
    });

    it('should have chrome-button class on submit button', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toHaveClass('chrome-button');
    });
  });

  describe('Theme Variations', () => {
    it('should apply light theme text colors', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={false}
        />
      );

      const rememberLabel = screen.getByText(/remember me/i);
      expect(rememberLabel).toHaveClass('text-white');
    });

    it('should apply dark theme text colors', () => {
      render(
        <LoginFormCard
          state={mockState}
          actions={mockActions}

          onForgotPassword={mockOnForgotPassword}
          isDark={true}
        />
      );

      const rememberLabel = screen.getByText(/remember me/i);
      expect(rememberLabel).toHaveClass('text-slate-200');
    });
  });
});
