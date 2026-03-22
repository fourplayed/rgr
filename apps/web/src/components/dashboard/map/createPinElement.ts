/**
 * createPinElement — Pure DOM factory for Mapbox GL pin markers
 *
 * Returns an HTMLDivElement for use with `new mapboxgl.Marker({ element })`.
 * Replicates the PinPerspective visual style (label pill, pulsing rings,
 * gradient stem, glowing dot) using CSS-only animations — no React overhead.
 */

export interface PinElementOptions {
  /** Stem gradient color, dot glow color, ring color */
  color: string;
  /** Text for the label pill above the pin */
  label?: string;
  /** Height of the gradient stem in px (default 55) */
  stemHeight?: number;
  /** Diameter of the glowing tip dot in px (default 6) */
  dotSize?: number;
  /** Show animated pulsing rings on hover (depot-style) */
  showRings?: boolean;
  /** If set, renders a count badge instead of the dot */
  clusterCount?: number;
  /** CSS z-index for stacking order */
  zIndex?: number;
  /** Label style variant */
  labelStyle?: 'depot' | 'asset';
}

let stylesInjected = false;

/** Inject shared keyframes + hover rules once */
function injectStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement('style');
  style.id = 'pin-marker-styles';
  style.textContent = `
    @keyframes pin-ring-pulse {
      0%   { opacity: 0; transform: translate(-50%, -50%) scale(0); }
      15%  { opacity: 0.6; }
      50%  { opacity: 0.3; }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
    }

    .pin-marker-root {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }

    /* Rings always visible for depot pins */
    .pin-marker-root .pin-rings {
      opacity: 1;
    }

    .pin-ring {
      position: absolute;
      left: 50%;
      bottom: 0;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--pin-color, cyan);
      opacity: 0;
      pointer-events: none;
      filter: blur(1px);
      animation: pin-ring-pulse 6s infinite;
    }
    .pin-ring:nth-child(1) { animation-delay: 0s; }
    .pin-ring:nth-child(2) { animation-delay: 2s; }
    .pin-ring:nth-child(3) { animation-delay: 4s; }

    /* Label hover glow */
    .pin-marker-root:hover .pin-label {
      filter: brightness(1.15);
    }

    /* Stem grows on hover */
    .pin-stem-line {
      transition: height 0.3s ease;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Create a pin marker DOM element for Mapbox GL
 */
export function createPinElement(opts: PinElementOptions): HTMLDivElement {
  injectStyles();

  const {
    color,
    label,
    stemHeight = 55,
    dotSize = 6,
    showRings = false,
    clusterCount,
    zIndex = 10,
    labelStyle = 'depot',
  } = opts;

  const wrapper = document.createElement('div');
  wrapper.className = 'pin-marker-el';
  wrapper.style.cssText = `margin:0;padding:0;line-height:0;z-index:${zIndex};`;

  const root = document.createElement('div');
  root.className = 'pin-marker-root';
  root.style.setProperty('--pin-color', color);

  // --- Label pill ---
  if (label) {
    const pill = document.createElement('div');
    pill.className = 'pin-label';

    if (labelStyle === 'depot') {
      pill.style.cssText = `
        position: relative; z-index: 1; color: white;
        font-family: 'Lato', sans-serif; font-size: 12px; font-weight: 700;
        letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap;
        text-shadow: 0 1px 3px rgba(0,0,0,0.5);
        background: ${color}; border: 1px solid ${color};
        padding: 6px 16px; border-radius: 8px;
        margin-bottom: 4px; cursor: pointer; pointer-events: auto;
        transition: background 0.2s ease, color 0.2s ease, filter 0.2s ease;
        overflow: visible;
      `;

      // Hover: slightly brighten
      pill.addEventListener('mouseenter', () => {
        pill.style.filter = 'brightness(1.2)';
      });
      pill.addEventListener('mouseleave', () => {
        pill.style.filter = 'brightness(1)';
      });
    } else {
      // asset label — dark translucent bg
      pill.style.cssText = `
        position: relative; z-index: 1; color: white;
        font-family: 'Lato', sans-serif; font-size: 11px; font-weight: 600;
        white-space: nowrap;
        background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1);
        padding: 3px 8px; border-radius: 6px;
        backdrop-filter: blur(8px);
        margin-bottom: 2px; pointer-events: auto;
        transition: filter 0.2s ease;
      `;
    }

    pill.textContent = label;
    root.appendChild(pill);
  }

  // --- Pulsing rings (depot only, always visible) ---
  if (showRings) {
    const ringsContainer = document.createElement('div');
    ringsContainer.className = 'pin-rings';
    ringsContainer.style.cssText = `
      position: absolute; bottom: 0; left: 50%;
      transform: translateX(-50%);
      pointer-events: none; z-index: 0;
    `;
    for (let i = 0; i < 3; i++) {
      const ring = document.createElement('div');
      ring.className = 'pin-ring';
      ring.style.background = `${color}14`;
      ringsContainer.appendChild(ring);
    }
    root.appendChild(ringsContainer);
  }

  // --- Gradient stem ---
  if (stemHeight > 0) {
    // Blurred glow behind stem
    const stemGlow = document.createElement('div');
    stemGlow.style.cssText = `
      width: 6px; height: ${stemHeight}px;
      background: linear-gradient(to bottom, ${color}20, ${color}08 65%, transparent);
      filter: blur(3px); pointer-events: none;
    `;
    root.appendChild(stemGlow);

    // Crisp stem line (overlaps glow via negative margin)
    const stemLine = document.createElement('div');
    stemLine.className = 'pin-stem-line';
    stemLine.style.cssText = `
      width: 2px; height: ${stemHeight}px;
      background: linear-gradient(to bottom, ${color}dd, ${color}99 25%, ${color}55 55%, ${color}22 80%, transparent);
      pointer-events: none; margin-top: -${stemHeight}px;
    `;
    root.appendChild(stemLine);
  }

  // --- Tip: dot or cluster count badge ---
  if (clusterCount != null) {
    // Cluster count badge
    const cs = clusterBadgeSize(clusterCount);
    const badge = document.createElement('div');
    badge.style.cssText = `
      width: ${cs.size}px; height: ${cs.size}px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: ${color}; color: white; font-weight: 700;
      font-size: ${cs.fontSize}px; font-family: 'Lato', sans-serif;
      box-shadow: 0 0 ${Math.round(cs.size * 0.4)}px ${color}80;
      cursor: pointer; flex-shrink: 0; pointer-events: auto;
      transition: transform 0.15s ease;
    `;
    badge.textContent = String(clusterCount);
    badge.addEventListener('mouseenter', () => {
      badge.style.transform = 'scale(1.1)';
    });
    badge.addEventListener('mouseleave', () => {
      badge.style.transform = '';
    });
    root.appendChild(badge);
  } else {
    const dot = document.createElement('div');
    dot.style.cssText = `
      width: ${dotSize}px; height: ${dotSize}px; border-radius: 50%;
      background: ${color};
      cursor: pointer; flex-shrink: 0; pointer-events: auto;
      transition: transform 0.15s ease;
    `;
    dot.addEventListener('mouseenter', () => {
      dot.style.transform = 'scale(1.5)';
    });
    dot.addEventListener('mouseleave', () => {
      dot.style.transform = '';
    });
    root.appendChild(dot);
  }

  wrapper.appendChild(root);
  return wrapper;
}

/** Log-scale cluster badge sizing (mirrors original clusterSize) */
function clusterBadgeSize(count: number): { size: number; fontSize: number } {
  const MIN_SIZE = 28,
    MAX_SIZE = 52,
    MIN_FONT = 10,
    MAX_FONT = 16;
  const t = Math.min(Math.log(count) / Math.log(50), 1);
  return {
    size: Math.round(MIN_SIZE + t * (MAX_SIZE - MIN_SIZE)),
    fontSize: Math.round(MIN_FONT + t * (MAX_FONT - MIN_FONT)),
  };
}
