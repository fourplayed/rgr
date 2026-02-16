/**
 * SlidingNavIndicator - Usage Examples
 *
 * This file demonstrates various usage patterns for the SlidingNavIndicator component.
 * These examples can be used for visual testing and documentation purposes.
 */
import React, { useState } from 'react';
import { SlidingNavIndicator } from './SlidingNavIndicator';
import { RGR_COLORS } from '@/styles/color-palette';

/**
 * Example 1: Basic Usage with Horizontal Nav Bar
 */
export const BasicExample: React.FC = () => {
  const [isDark, setIsDark] = useState(true);

  return (
    <div className="p-8" style={{ backgroundColor: isDark ? '#060b28' : '#f3f4f6' }}>
      <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#000' }}>
        Basic Horizontal Navigation
      </h2>

      <nav
        aria-label="Main navigation"
        className="relative p-4 rounded-lg"
        style={{
          backgroundColor: isDark ? 'rgba(0, 0, 40, 0.6)' : 'rgba(255, 255, 255, 0.9)',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        }}
      >
        <SlidingNavIndicator isDark={isDark} />

        <div className="flex gap-8">
          <button
            aria-label="Home"
            className="px-4 py-2 font-medium transition-colors"
            style={{ color: isDark ? RGR_COLORS.chrome.medium : '#0a2654' }}
          >
            Home
          </button>
          <button
            aria-label="Products"
            className="px-4 py-2 font-medium transition-colors"
            style={{ color: isDark ? RGR_COLORS.chrome.medium : '#0a2654' }}
          >
            Products
          </button>
          <button
            aria-label="About"
            className="px-4 py-2 font-medium transition-colors"
            style={{ color: isDark ? RGR_COLORS.chrome.medium : '#0a2654' }}
          >
            About
          </button>
          <button
            aria-label="Contact"
            className="px-4 py-2 font-medium transition-colors"
            style={{ color: isDark ? RGR_COLORS.chrome.medium : '#0a2654' }}
          >
            Contact
          </button>
        </div>
      </nav>

      <button
        onClick={() => setIsDark(!isDark)}
        className="mt-4 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
      >
        Toggle Theme
      </button>
    </div>
  );
};

/**
 * Example 2: Nav Bar with Icons
 */
export const WithIconsExample: React.FC = () => {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className="p-8" style={{ backgroundColor: isDark ? '#060b28' : '#f3f4f6' }}>
      <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#000' }}>
        Navigation with Icons
      </h2>

      <nav
        aria-label="Main navigation"
        className="relative p-4 rounded-lg"
        style={{
          backgroundColor: isDark ? 'rgba(0, 0, 40, 0.6)' : 'rgba(255, 255, 255, 0.9)',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        }}
      >
        <SlidingNavIndicator isDark={isDark} />

        <div className="flex gap-6">
          <button
            aria-label="Dashboard"
            className="flex items-center gap-2 px-4 py-2 font-medium transition-colors"
            style={{ color: isDark ? RGR_COLORS.chrome.medium : '#0a2654' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard
          </button>
          <button
            aria-label="Analytics"
            className="flex items-center gap-2 px-4 py-2 font-medium transition-colors"
            style={{ color: isDark ? RGR_COLORS.chrome.medium : '#0a2654' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75z" />
              <path d="M9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625z" />
              <path d="M16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125z" />
            </svg>
            Analytics
          </button>
          <button
            aria-label="Settings"
            className="flex items-center gap-2 px-4 py-2 font-medium transition-colors"
            style={{ color: isDark ? RGR_COLORS.chrome.medium : '#0a2654' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
            </svg>
            Settings
          </button>
        </div>
      </nav>

      <button
        onClick={() => setIsDark(!isDark)}
        className="mt-4 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
      >
        Toggle Theme
      </button>
    </div>
  );
};

/**
 * Example 3: Compact Nav Bar
 */
export const CompactExample: React.FC = () => {
  const [isDark, setIsDark] = useState(true);

  return (
    <div className="p-8" style={{ backgroundColor: isDark ? '#060b28' : '#f3f4f6' }}>
      <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#000' }}>
        Compact Navigation Bar
      </h2>

      <nav
        aria-label="Main navigation"
        className="relative p-2 rounded-lg inline-block"
        style={{
          backgroundColor: isDark ? 'rgba(0, 0, 40, 0.6)' : 'rgba(255, 255, 255, 0.9)',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        }}
      >
        <SlidingNavIndicator isDark={isDark} zIndex={1} />

        <div className="flex gap-2">
          <button
            aria-label="All"
            className="px-3 py-1 text-sm font-medium transition-colors rounded"
            style={{ color: isDark ? RGR_COLORS.chrome.medium : '#0a2654' }}
          >
            All
          </button>
          <button
            aria-label="Serviced"
            className="px-3 py-1 text-sm font-medium transition-colors rounded"
            style={{ color: isDark ? RGR_COLORS.chrome.medium : '#0a2654' }}
          >
            Serviced
          </button>
          <button
            aria-label="Completed"
            className="px-3 py-1 text-sm font-medium transition-colors rounded"
            style={{ color: isDark ? RGR_COLORS.chrome.medium : '#0a2654' }}
          >
            Completed
          </button>
        </div>
      </nav>

      <button
        onClick={() => setIsDark(!isDark)}
        className="mt-4 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
      >
        Toggle Theme
      </button>
    </div>
  );
};

/**
 * Example 4: Wide Spacing Nav Bar
 */
export const WideSpacingExample: React.FC = () => {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className="p-8" style={{ backgroundColor: isDark ? '#060b28' : '#f3f4f6' }}>
      <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#000' }}>
        Wide Spacing Navigation
      </h2>

      <nav
        aria-label="Main navigation"
        className="relative p-6 rounded-lg"
        style={{
          backgroundColor: isDark ? 'rgba(0, 0, 40, 0.6)' : 'rgba(255, 255, 255, 0.9)',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        }}
      >
        <SlidingNavIndicator isDark={isDark} />

        <div className="flex gap-16 justify-center">
          <button
            aria-label="Overview"
            className="px-6 py-3 text-lg font-medium transition-colors"
            style={{ color: isDark ? RGR_COLORS.chrome.medium : '#0a2654' }}
          >
            Overview
          </button>
          <button
            aria-label="Features"
            className="px-6 py-3 text-lg font-medium transition-colors"
            style={{ color: isDark ? RGR_COLORS.chrome.medium : '#0a2654' }}
          >
            Features
          </button>
          <button
            aria-label="Pricing"
            className="px-6 py-3 text-lg font-medium transition-colors"
            style={{ color: isDark ? RGR_COLORS.chrome.medium : '#0a2654' }}
          >
            Pricing
          </button>
        </div>
      </nav>

      <button
        onClick={() => setIsDark(!isDark)}
        className="mt-4 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
      >
        Toggle Theme
      </button>
    </div>
  );
};

/**
 * All Examples Component
 * Displays all usage examples in a single page
 */
export const AllExamples: React.FC = () => {
  return (
    <div className="space-y-12">
      <BasicExample />
      <WithIconsExample />
      <CompactExample />
      <WideSpacingExample />
    </div>
  );
};

export default AllExamples;
