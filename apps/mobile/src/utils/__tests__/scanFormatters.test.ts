import { formatScanTypeLabel, getScanTypeIcon, getScanTypeColor } from '../scanFormatters';

describe('formatScanTypeLabel', () => {
  it('formats qr_scan as "QR Scan"', () => {
    expect(formatScanTypeLabel('qr_scan')).toBe('QR Scan');
  });

  it('formats nfc_scan as "NFC Scan"', () => {
    expect(formatScanTypeLabel('nfc_scan')).toBe('NFC Scan');
  });

  it('formats gps_auto as "GPS Auto"', () => {
    expect(formatScanTypeLabel('gps_auto')).toBe('GPS Auto');
  });

  it('formats manual_entry as "Manual Entry"', () => {
    expect(formatScanTypeLabel('manual_entry')).toBe('Manual Entry');
  });

  it('handles unknown types gracefully', () => {
    expect(formatScanTypeLabel('photo_upload')).toBe('Photo Upload');
  });
});

describe('getScanTypeIcon', () => {
  it('returns qr-code-outline for QR scan types', () => {
    expect(getScanTypeIcon('qr_scan')).toBe('qr-code-outline');
    expect(getScanTypeIcon('nfc_scan')).toBe('qr-code-outline');
    expect(getScanTypeIcon('manual_entry')).toBe('qr-code-outline');
  });

  it('returns camera-outline for photo_upload', () => {
    expect(getScanTypeIcon('photo_upload')).toBe('camera-outline');
  });

  it('returns scan-outline for unknown types', () => {
    expect(getScanTypeIcon('unknown_type')).toBe('scan-outline');
  });
});

describe('getScanTypeColor', () => {
  it('returns a valid color string for known types', () => {
    expect(getScanTypeColor('qr_scan')).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(getScanTypeColor('photo_upload')).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(getScanTypeColor('maintenance')).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('returns a fallback color for unknown types', () => {
    expect(getScanTypeColor('unknown')).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
