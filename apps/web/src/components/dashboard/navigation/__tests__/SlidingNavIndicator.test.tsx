/**
 * SlidingNavIndicator Tests
 *
 * Tests for the animated navigation indicator component
 */
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SlidingNavIndicator } from '../SlidingNavIndicator';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/dashboard' }),
}));

// Mock RAF
let rafCallbacks: FrameRequestCallback[] = [];
let rafId = 0;

// Store original getBoundingClientRect before mocking
let originalGetBoundingClientRect: typeof Element.prototype.getBoundingClientRect;

beforeEach(() => {
  rafCallbacks = [];
  rafId = 0;

  // Store original before mocking
  originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

  // Mock requestAnimationFrame
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
    rafCallbacks.push(cb);
    return ++rafId;
  });

  // Mock cancelAnimationFrame
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
    // Remove callback from array
    rafCallbacks = rafCallbacks.filter((_, index) => index + 1 !== id);
  });

  // Create mock nav structure
  const navContainer = document.createElement('nav');
  navContainer.setAttribute('aria-label', 'Main navigation');

  // Create mock nav buttons with data-nav-button attribute (required by component)
  // Include svg and span elements for width calculation
  const button1 = document.createElement('button');
  button1.setAttribute('aria-label', 'Dashboard');
  button1.setAttribute('data-nav-button', 'true');
  const icon1 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const text1 = document.createElement('span');
  text1.setAttribute('data-nav-label', 'Dashboard');
  text1.textContent = 'Dashboard';
  button1.appendChild(icon1);
  button1.appendChild(text1);

  const button2 = document.createElement('button');
  button2.setAttribute('aria-label', 'Assets');
  button2.setAttribute('data-nav-button', 'true');
  const icon2 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const text2 = document.createElement('span');
  text2.setAttribute('data-nav-label', 'Assets');
  text2.textContent = 'Assets';
  button2.appendChild(icon2);
  button2.appendChild(text2);

  navContainer.appendChild(button1);
  navContainer.appendChild(button2);
  document.body.appendChild(navContainer);

  // Mock getBoundingClientRect
  Element.prototype.getBoundingClientRect = function(this: Element) {
    // Dashboard button
    if (this.getAttribute('aria-label') === 'Dashboard') {
      return {
        left: 0,
        right: 100,
        top: 0,
        bottom: 40,
        width: 100,
        height: 40,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect;
    }
    // Assets button
    if (this.getAttribute('aria-label') === 'Assets') {
      return {
        left: 120,
        right: 200,
        top: 0,
        bottom: 40,
        width: 80,
        height: 40,
        x: 120,
        y: 0,
        toJSON: () => {},
      } as DOMRect;
    }
    // Nav container
    if (this.getAttribute('aria-label') === 'Main navigation') {
      return {
        left: 0,
        right: 300,
        top: 0,
        bottom: 60,
        width: 300,
        height: 60,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect;
    }
    // SVG icons inside Dashboard button (parent has aria-label Dashboard)
    if (this.tagName === 'svg' && this.parentElement?.getAttribute('aria-label') === 'Dashboard') {
      return {
        left: 5,
        right: 25,
        top: 10,
        bottom: 30,
        width: 20,
        height: 20,
        x: 5,
        y: 10,
        toJSON: () => {},
      } as DOMRect;
    }
    // Text span inside Dashboard button (has data-nav-label)
    if (this.tagName === 'SPAN' && this.getAttribute('data-nav-label') === 'Dashboard') {
      return {
        left: 30,
        right: 95,
        top: 10,
        bottom: 30,
        width: 65,
        height: 20,
        x: 30,
        y: 10,
        toJSON: () => {},
      } as DOMRect;
    }
    // SVG icons inside Assets button
    if (this.tagName === 'svg' && this.parentElement?.getAttribute('aria-label') === 'Assets') {
      return {
        left: 125,
        right: 145,
        top: 10,
        bottom: 30,
        width: 20,
        height: 20,
        x: 125,
        y: 10,
        toJSON: () => {},
      } as DOMRect;
    }
    // Text span inside Assets button (has data-nav-label)
    if (this.tagName === 'SPAN' && this.getAttribute('data-nav-label') === 'Assets') {
      return {
        left: 150,
        right: 195,
        top: 10,
        bottom: 30,
        width: 45,
        height: 20,
        x: 150,
        y: 10,
        toJSON: () => {},
      } as DOMRect;
    }
    return {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect;
  };
});

afterEach(() => {
  // Cleanup - restore original implementations
  (window.requestAnimationFrame as unknown as ReturnType<typeof vi.spyOn>).mockRestore?.();
  (window.cancelAnimationFrame as unknown as ReturnType<typeof vi.spyOn>).mockRestore?.();
  // Restore original getBoundingClientRect
  Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  document.body.innerHTML = '';
});

describe('SlidingNavIndicator', () => {
  it('should render with zero opacity initially', () => {
    const { container } = render(<SlidingNavIndicator isDark={true} />);
    const indicator = container.querySelector('div');

    expect(indicator).toBeTruthy();
    expect(indicator?.style.opacity).toBe('0');
    // Verify indicator renders with gradient background (not hovered)
    expect(indicator?.style.background).toContain('linear-gradient');
  });

  it('should render with correct aria-hidden attribute', () => {
    const { container } = render(<SlidingNavIndicator isDark={false} />);
    const indicator = container.querySelector('div');

    expect(indicator?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should apply dark theme colors', () => {
    const { container } = render(<SlidingNavIndicator isDark={true} />);
    const indicator = container.querySelector('div');

    // Component uses gradient background for dark theme (not hovered)
    expect(indicator?.style.background).toContain('linear-gradient');
  });

  it('should apply light theme colors', () => {
    const { container } = render(<SlidingNavIndicator isDark={false} />);
    const indicator = container.querySelector('div');

    // Component uses gradient background for light theme (not hovered)
    expect(indicator?.style.background).toContain('linear-gradient');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <SlidingNavIndicator isDark={true} className="custom-class" />
    );
    const indicator = container.querySelector('div');

    expect(indicator?.className).toContain('custom-class');
  });

  it('should apply custom z-index', () => {
    const { container } = render(<SlidingNavIndicator isDark={true} zIndex={20} />);
    const indicator = container.querySelector('div');

    expect(indicator?.style.zIndex).toBe('20');
  });

  it('should update position on button hover', async () => {
    const { container } = render(<SlidingNavIndicator isDark={true} />);
    const indicator = container.querySelector('div');
    const button = document.querySelector('[aria-label="Dashboard"]');

    expect(button).toBeTruthy();

    // Simulate mouse enter event
    const mouseEnterEvent = new Event('mouseenter', { bubbles: true });
    button?.dispatchEvent(mouseEnterEvent);

    // Execute RAF callbacks
    rafCallbacks.forEach((cb) => cb(0));

    // Width = textRect.right - iconRect.left + 10 = 95 - 5 + 10 = 100
    // Left = iconRect.left - containerRect.left - 5 = 5 - 0 - 5 = 0
    await waitFor(() => {
      expect(indicator?.style.opacity).toBe('1');
      expect(indicator?.style.width).toBe('100px');
      expect(indicator?.style.left).toBe('0px');
      // When hovered, background should be white
      expect(indicator?.style.background).toBe('rgb(255, 255, 255)');
    });
  });

  it('should handle sliding between buttons', async () => {
    const { container } = render(<SlidingNavIndicator isDark={true} />);
    const indicator = container.querySelector('div');
    const dashboardButton = document.querySelector('[aria-label="Dashboard"]');
    const assetsButton = document.querySelector('[aria-label="Assets"]');

    // Hover first button (Dashboard)
    // Left = iconRect.left - containerRect.left - 5 = 5 - 0 - 5 = 0
    // Width = textRect.right - iconRect.left + 10 = 95 - 5 + 10 = 100
    const mouseEnter1 = new Event('mouseenter', { bubbles: true });
    dashboardButton?.dispatchEvent(mouseEnter1);
    rafCallbacks.forEach((cb) => cb(0));

    await waitFor(() => {
      expect(indicator?.style.left).toBe('0px');
      expect(indicator?.style.width).toBe('100px');
    });

    // Hover second button (Assets)
    // Left = iconRect.left - containerRect.left - 5 = 125 - 0 - 5 = 120
    // Width = textRect.right - iconRect.left + 10 = 195 - 125 + 10 = 80
    const mouseEnter2 = new Event('mouseenter', { bubbles: true });
    assetsButton?.dispatchEvent(mouseEnter2);
    rafCallbacks.forEach((cb) => cb(0));

    await waitFor(() => {
      expect(indicator?.style.left).toBe('120px');
      expect(indicator?.style.width).toBe('80px');
    });
  });

  it('should fade out immediately on mouseleave', async () => {
    const { container } = render(<SlidingNavIndicator isDark={true} />);
    const indicator = container.querySelector('div');
    const navContainer = document.querySelector('[aria-label="Main navigation"]');
    const button = document.querySelector('[aria-label="Dashboard"]');

    // Hover button to show indicator
    const mouseEnter = new Event('mouseenter', { bubbles: true });
    button?.dispatchEvent(mouseEnter);
    rafCallbacks.forEach((cb) => cb(0));

    await waitFor(() => {
      expect(indicator?.style.opacity).toBe('1');
    });

    // Trigger mouseleave on nav container - should fade immediately (no delay)
    const mouseLeave = new Event('mouseleave', { bubbles: true });
    navContainer?.dispatchEvent(mouseLeave);

    await waitFor(() => {
      expect(indicator?.style.opacity).toBe('0');
    });
  });

  it('should show indicator again when hovering new button after fade', async () => {
    const { container } = render(<SlidingNavIndicator isDark={true} />);
    const indicator = container.querySelector('div');
    const navContainer = document.querySelector('[aria-label="Main navigation"]');
    const button1 = document.querySelector('[aria-label="Dashboard"]');
    const button2 = document.querySelector('[aria-label="Assets"]');

    // Hover first button
    const mouseEnter1 = new Event('mouseenter', { bubbles: true });
    button1?.dispatchEvent(mouseEnter1);
    rafCallbacks.forEach((cb) => cb(0));

    await waitFor(() => {
      expect(indicator?.style.opacity).toBe('1');
    });

    // Trigger mouseleave - fades immediately
    const mouseLeave = new Event('mouseleave', { bubbles: true });
    navContainer?.dispatchEvent(mouseLeave);

    await waitFor(() => {
      expect(indicator?.style.opacity).toBe('0');
    });

    // Hover second button - should show indicator again
    const mouseEnter2 = new Event('mouseenter', { bubbles: true });
    button2?.dispatchEvent(mouseEnter2);
    rafCallbacks.forEach((cb) => cb(0));

    await waitFor(() => {
      expect(indicator?.style.opacity).toBe('1');
      // Left = iconRect.left - containerRect.left - 5 = 125 - 0 - 5 = 120
      expect(indicator?.style.left).toBe('120px');
    });
  });

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(Element.prototype, 'removeEventListener');

    const { unmount } = render(<SlidingNavIndicator isDark={true} />);

    unmount();

    // Should remove listeners from nav container and buttons
    expect(removeEventListenerSpy).toHaveBeenCalled();
  });

  it('should apply GPU acceleration styles', () => {
    const { container } = render(<SlidingNavIndicator isDark={true} />);
    const indicator = container.querySelector('div');

    expect(indicator?.style.transform).toBe('translateZ(0)');
    expect(indicator?.style.willChange).toBe('left, width, opacity');
  });

  it('should have proper CSS transition styles', () => {
    const { container } = render(<SlidingNavIndicator isDark={true} />);
    const indicator = container.querySelector('div');

    // Component uses inline styles for transitions, not Tailwind classes
    expect(indicator?.style.transition).toContain('left');
    expect(indicator?.style.transition).toContain('width');
    expect(indicator?.style.transition).toContain('opacity');
    expect(indicator?.className).toContain('ease-out');
  });

  it('should keep white background when hovered', async () => {
    const { container } = render(<SlidingNavIndicator isDark={true} />);
    const indicator = container.querySelector('div');
    const button = document.querySelector('[aria-label="Dashboard"]');

    // Initially gradient
    expect(indicator?.style.background).toContain('linear-gradient');

    // Hover button
    const mouseEnter = new Event('mouseenter', { bubbles: true });
    button?.dispatchEvent(mouseEnter);
    rafCallbacks.forEach((cb) => cb(0));

    // Component sets solid white background when hovered
    await waitFor(() => {
      expect(indicator?.style.opacity).toBe('1');
      expect(indicator?.style.background).toBe('rgb(255, 255, 255)');
    });
  });

  it('should handle missing nav container gracefully', () => {
    // Remove nav container
    document.body.innerHTML = '';

    // Should not throw error
    expect(() => {
      render(<SlidingNavIndicator isDark={true} />);
    }).not.toThrow();
  });
});
