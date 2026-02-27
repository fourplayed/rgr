import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement URL.createObjectURL/revokeObjectURL.
// Mock them globally so React cleanup effects can call them safely.
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = () => 'blob:mock-url';
}
if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = () => {};
}
