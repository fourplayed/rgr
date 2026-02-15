/**
 * Tests for ManualEntry components
 *
 * Tests form validation, input parsing, and submission handling
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ManualEntry, { CompactManualEntry } from '../ManualEntry';

// Mock shared utilities
vi.mock('@rgr/shared', () => ({
  parseQRCode: vi.fn((value: string) => {
    if (value.startsWith('rgr://asset/') && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.slice(12))) {
      return { assetId: value.slice(12).toLowerCase(), error: null };
    }
    return { assetId: null, error: 'Invalid format' };
  }),
  isValidQRCode: vi.fn((value: string) => {
    return value.startsWith('rgr://asset/') && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.slice(12));
  }),
  extractAssetInfo: vi.fn((value: string) => {
    // Full QR code
    if (value.startsWith('rgr://asset/')) {
      const uuid = value.slice(12);
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
        return { assetId: uuid.toLowerCase(), format: 'uuid' };
      }
      return null;
    }
    // Asset number
    if (/^(TL|DL)\d{3,}$/i.test(value)) {
      return { assetId: value.toUpperCase(), format: 'asset_number' };
    }
    // UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      return { assetId: value.toLowerCase(), format: 'uuid' };
    }
    return null;
  }),
  isAssetNumber: vi.fn((value: string) => /^(TL|DL)\d{3,}$/i.test(value)),
}));

describe('ManualEntry', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render input and submit button', () => {
      render(<ManualEntry {...defaultProps} />);

      expect(screen.getByLabelText(/qr code or asset number/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /look up/i })).toBeInTheDocument();
    });

    it('should render accepted formats section', () => {
      render(<ManualEntry {...defaultProps} />);

      expect(screen.getByText(/accepted formats/i)).toBeInTheDocument();
      expect(screen.getByText(/full qr code/i)).toBeInTheDocument();
      // Use getAllByText since "asset number" appears in multiple places
      expect(screen.getAllByText(/asset number/i).length).toBeGreaterThan(0);
      // Check for the specific format example instead
      expect(screen.getByText(/TL001/)).toBeInTheDocument();
    });

    it('should render cancel button when onCancel is provided', () => {
      const onCancel = vi.fn();
      render(<ManualEntry {...defaultProps} onCancel={onCancel} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('input validation', () => {
    it('should show success indicator for valid QR code', async () => {
      const user = userEvent.setup();
      render(<ManualEntry {...defaultProps} />);

      const input = screen.getByLabelText(/qr code or asset number/i);
      await user.type(input, 'rgr://asset/550e8400-e29b-41d4-a716-446655440000');

      expect(screen.getByText(/qr code detected/i)).toBeInTheDocument();
    });

    it('should show success indicator for valid asset number', async () => {
      const user = userEvent.setup();
      render(<ManualEntry {...defaultProps} />);

      const input = screen.getByLabelText(/qr code or asset number/i);
      await user.type(input, 'TL001');

      expect(screen.getByText(/asset number detected/i)).toBeInTheDocument();
    });

    it('should show success indicator for valid UUID', async () => {
      const user = userEvent.setup();
      render(<ManualEntry {...defaultProps} />);

      const input = screen.getByLabelText(/qr code or asset number/i);
      await user.type(input, '550e8400-e29b-41d4-a716-446655440000');

      expect(screen.getByText(/uuid detected/i)).toBeInTheDocument();
    });

    it('should show warning for invalid format', async () => {
      const user = userEvent.setup();
      render(<ManualEntry {...defaultProps} />);

      const input = screen.getByLabelText(/qr code or asset number/i);
      await user.type(input, 'invalid-input');

      expect(screen.getByText(/format not recognized/i)).toBeInTheDocument();
    });

    it('should disable submit button for invalid input', async () => {
      const user = userEvent.setup();
      render(<ManualEntry {...defaultProps} />);

      const input = screen.getByLabelText(/qr code or asset number/i);
      await user.type(input, 'invalid-input');

      const submitButton = screen.getByRole('button', { name: /look up/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button for valid input', async () => {
      const user = userEvent.setup();
      render(<ManualEntry {...defaultProps} />);

      const input = screen.getByLabelText(/qr code or asset number/i);
      await user.type(input, 'TL001');

      const submitButton = screen.getByRole('button', { name: /look up/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('form submission', () => {
    it('should call onSubmit with QR code type', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<ManualEntry onSubmit={onSubmit} />);

      const input = screen.getByLabelText(/qr code or asset number/i);
      await user.type(input, 'rgr://asset/550e8400-e29b-41d4-a716-446655440000');
      await user.click(screen.getByRole('button', { name: /look up/i }));

      expect(onSubmit).toHaveBeenCalledWith(
        'rgr://asset/550e8400-e29b-41d4-a716-446655440000',
        'qr'
      );
    });

    it('should call onSubmit with asset_number type', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<ManualEntry onSubmit={onSubmit} />);

      const input = screen.getByLabelText(/qr code or asset number/i);
      await user.type(input, 'TL001');
      await user.click(screen.getByRole('button', { name: /look up/i }));

      expect(onSubmit).toHaveBeenCalledWith('TL001', 'asset_number');
    });

    it('should call onSubmit with uuid type', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<ManualEntry onSubmit={onSubmit} />);

      const input = screen.getByLabelText(/qr code or asset number/i);
      await user.type(input, '550e8400-e29b-41d4-a716-446655440000');
      await user.click(screen.getByRole('button', { name: /look up/i }));

      expect(onSubmit).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'uuid'
      );
    });

    it('should show error for invalid submission', async () => {
      const user = userEvent.setup();
      render(<ManualEntry {...defaultProps} />);

      const input = screen.getByLabelText(/qr code or asset number/i);
      await user.type(input, 'x');

      // Force submit even with disabled button
      const form = input.closest('form');
      fireEvent.submit(form!);

      expect(screen.getByText(/invalid format/i)).toBeInTheDocument();
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup();
      render(<ManualEntry {...defaultProps} onCancel={onCancel} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should disable input when loading', () => {
      render(<ManualEntry {...defaultProps} isLoading={true} />);

      const input = screen.getByLabelText(/qr code or asset number/i);
      expect(input).toBeDisabled();
    });

    it('should show loading state on submit button', () => {
      render(<ManualEntry {...defaultProps} isLoading={true} />);

      // Button should indicate loading state
      const submitButton = screen.getByRole('button', { name: /look up/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('external error', () => {
    it('should display external error', () => {
      render(<ManualEntry {...defaultProps} error="Asset not found" />);

      expect(screen.getByText(/asset not found/i)).toBeInTheDocument();
    });
  });
});

describe('CompactManualEntry', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render input and submit button', () => {
      render(<CompactManualEntry {...defaultProps} />);

      expect(screen.getByPlaceholderText(/enter asset number/i)).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should accept custom placeholder', () => {
      render(<CompactManualEntry {...defaultProps} placeholder="Custom placeholder" />);

      expect(screen.getByPlaceholderText(/custom placeholder/i)).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('should validate and submit valid asset number', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<CompactManualEntry onSubmit={onSubmit} />);

      const input = screen.getByPlaceholderText(/enter asset number/i);
      await user.type(input, 'TL001');
      await user.click(screen.getByRole('button'));

      expect(onSubmit).toHaveBeenCalledWith('TL001', 'asset_number');
    });

    it('should show error for invalid input', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<CompactManualEntry onSubmit={onSubmit} />);

      const input = screen.getByPlaceholderText(/enter asset number/i);
      await user.type(input, 'invalid');
      await user.click(screen.getByRole('button'));

      // Use getAllByText since error may appear in multiple places
      expect(screen.getAllByText(/invalid format/i).length).toBeGreaterThan(0);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should call onValidationError callback', async () => {
      const onValidationError = vi.fn();
      const user = userEvent.setup();
      render(<CompactManualEntry {...defaultProps} onValidationError={onValidationError} />);

      const input = screen.getByPlaceholderText(/enter asset number/i);
      await user.type(input, 'invalid');
      await user.click(screen.getByRole('button'));

      expect(onValidationError).toHaveBeenCalledWith(expect.stringContaining('Invalid format'));
    });

    it('should clear input after successful submit', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<CompactManualEntry onSubmit={onSubmit} />);

      const input = screen.getByPlaceholderText(/enter asset number/i) as HTMLInputElement;
      await user.type(input, 'TL001');
      await user.click(screen.getByRole('button'));

      expect(input.value).toBe('');
    });

    it('should clear error when typing', async () => {
      const user = userEvent.setup();
      render(<CompactManualEntry {...defaultProps} />);

      const input = screen.getByPlaceholderText(/enter asset number/i);

      // First, trigger an error
      await user.type(input, 'x');
      await user.click(screen.getByRole('button'));
      // Use getAllByText since error may appear in multiple places
      expect(screen.getAllByText(/invalid format/i).length).toBeGreaterThan(0);

      // Then type more - error should clear
      await user.type(input, 'TL001');
      expect(screen.queryAllByText(/invalid format/i).length).toBe(0);
    });
  });

  describe('loading state', () => {
    it('should disable input when loading', () => {
      render(<CompactManualEntry {...defaultProps} isLoading={true} />);

      const input = screen.getByPlaceholderText(/enter asset number/i);
      expect(input).toBeDisabled();
    });
  });
});
