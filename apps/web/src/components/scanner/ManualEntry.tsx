import { useState, useCallback, FormEvent } from 'react';
import { Search, QrCode, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { isValidQRCode, extractAssetInfo, isAssetNumber } from '@rgr/shared';

interface ManualEntryProps {
  onSubmit: (value: string, type: 'qr' | 'asset_number' | 'uuid') => void;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

type InputType = 'qr' | 'asset_number' | 'uuid';

interface ParseResult {
  isValid: boolean;
  type: InputType | null;
  value: string | null;
  assetId: string | null;
}

/**
 * Manual entry component for QR code value or asset number
 * Provides fallback when camera scanning is unavailable
 */
export default function ManualEntry({
  onSubmit,
  onCancel,
  isLoading = false,
  error: externalError,
  className = '',
}: ManualEntryProps) {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  /**
   * Parse input value and determine type using shared utilities
   */
  const parseInput = useCallback((value: string): ParseResult => {
    const trimmed = value.trim();

    if (!trimmed) {
      return { isValid: false, type: null, value: null, assetId: null };
    }

    // Use shared utility to extract asset info (handles QR, UUID, and asset number)
    const assetInfo = extractAssetInfo(trimmed);

    if (assetInfo) {
      // Check if it was a full QR code format
      if (isValidQRCode(trimmed)) {
        return {
          isValid: true,
          type: 'qr',
          value: trimmed,
          assetId: assetInfo.assetId,
        };
      }

      // Check if it's an asset number
      if (isAssetNumber(trimmed)) {
        return {
          isValid: true,
          type: 'asset_number',
          value: assetInfo.assetId, // Already uppercase from extractAssetInfo
          assetId: null, // Will be resolved server-side
        };
      }

      // Must be a UUID
      return {
        isValid: true,
        type: 'uuid',
        value: assetInfo.assetId, // Already lowercase from extractAssetInfo
        assetId: assetInfo.assetId,
      };
    }

    return { isValid: false, type: null, value: trimmed, assetId: null };
  }, []);

  /**
   * Handle input change
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);
      setInputError(null);

      if (value.trim()) {
        const result = parseInput(value);
        setParseResult(result);
      } else {
        setParseResult(null);
      }
    },
    [parseInput]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();

      const result = parseInput(inputValue);

      if (!result.isValid || !result.type || !result.value) {
        setInputError(
          'Invalid format. Please enter a valid QR code (rgr://asset/UUID), asset number (TL001), or UUID.'
        );
        return;
      }

      onSubmit(result.value, result.type);
    },
    [inputValue, parseInput, onSubmit]
  );

  /**
   * Get input status icon
   */
  const getStatusIcon = () => {
    if (!inputValue.trim()) return null;

    if (parseResult?.isValid) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }

    return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  };

  /**
   * Get format hint based on parse result
   */
  const getFormatHint = () => {
    if (!parseResult) return null;

    if (parseResult.isValid) {
      switch (parseResult.type) {
        case 'qr':
          return (
            <span className="text-green-600">
              QR code detected - Asset ID: {parseResult.assetId?.slice(0, 8)}...
            </span>
          );
        case 'asset_number':
          return <span className="text-green-600">Asset number detected: {parseResult.value}</span>;
        case 'uuid':
          return (
            <span className="text-green-600">
              UUID detected: {parseResult.value?.slice(0, 8)}...
            </span>
          );
        default:
          return null;
      }
    }

    return (
      <span className="text-yellow-600">
        Format not recognized. Expected: rgr://asset/UUID, TL001, or UUID
      </span>
    );
  };

  const displayError = externalError || inputError;

  return (
    <Card className={`p-4 ${className ?? ''}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <QrCode className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Manual Entry</h3>
            <p className="text-sm text-gray-500">Enter the QR code value or asset number</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="text-sm font-medium text-foreground">QR Code or Asset Number</label>
            <Input
              placeholder="rgr://asset/... or TL001"
              value={inputValue}
              onChange={handleInputChange}
              disabled={isLoading}
              className="pr-10 mt-1"
              aria-invalid={!!displayError}
            />
            <div className="absolute right-3 top-8">{getStatusIcon()}</div>
            {displayError && <p className="text-sm text-destructive mt-1">{displayError}</p>}
            {!displayError && getFormatHint() && <p className="text-sm text-muted-foreground mt-1">{getFormatHint()}</p>}
          </div>

          {/* Format Examples */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="font-medium text-gray-700 mb-2">Accepted formats:</p>
            <ul className="text-gray-600 space-y-1">
              <li>
                <code className="bg-gray-200 px-1 rounded">rgr://asset/uuid-here</code> - Full QR
                code
              </li>
              <li>
                <code className="bg-gray-200 px-1 rounded">TL001</code> or{' '}
                <code className="bg-gray-200 px-1 rounded">DL015</code> - Asset number
              </li>
              <li>
                <code className="bg-gray-200 px-1 rounded">
                  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                </code>{' '}
                - UUID
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isLoading || !parseResult?.isValid}
              className="flex-1"
            >
              <Search className="w-4 h-4 mr-2" />
              Look Up Asset
            </Button>
            {onCancel && (
              <Button type="button" variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>
    </Card>
  );
}

/**
 * Compact manual entry input with validation
 */
export function CompactManualEntry({
  onSubmit,
  isLoading = false,
  placeholder = 'Enter asset number or QR code...',
  onValidationError,
}: {
  onSubmit: (value: string, type: 'qr' | 'asset_number' | 'uuid') => void;
  isLoading?: boolean;
  placeholder?: string;
  onValidationError?: (error: string) => void;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();

    if (!trimmed) {
      return;
    }

    // Validate input using shared utilities
    const assetInfo = extractAssetInfo(trimmed);

    if (!assetInfo) {
      const errorMsg = 'Invalid format. Enter asset number (TL001) or UUID.';
      setError(errorMsg);
      onValidationError?.(errorMsg);
      return;
    }

    setError(null);

    // Determine the type and submit
    if (isValidQRCode(trimmed)) {
      onSubmit(trimmed, 'qr');
    } else if (isAssetNumber(trimmed)) {
      onSubmit(assetInfo.assetId, 'asset_number');
    } else {
      onSubmit(assetInfo.assetId, 'uuid');
    }

    // Clear input on successful submit
    setValue('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder={placeholder}
          disabled={isLoading}
          aria-invalid={!!error}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || !value.trim()}>
          <Search className="w-4 h-4" />
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
