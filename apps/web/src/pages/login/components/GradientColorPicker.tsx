/**
 * GradientColorPicker - Interactive color pickers for background gradient customization
 * Inline component for use in debug toolbar
 */

interface GradientColorPickerProps {
  onTopColorChange: (color: string) => void;
  onUpperMiddleColorChange: (color: string) => void;
  onLowerMiddleColorChange: (color: string) => void;
  onBottomColorChange: (color: string) => void;
  topColor: string;
  upperMiddleColor: string;
  lowerMiddleColor: string;
  bottomColor: string;
  isDark?: boolean;
  defaultColors: {
    top: string;
    upperMiddle: string;
    lowerMiddle: string;
    bottom: string;
  };
}

export function GradientColorPicker({
  onTopColorChange,
  onUpperMiddleColorChange,
  onLowerMiddleColorChange,
  onBottomColorChange,
  topColor,
  upperMiddleColor,
  lowerMiddleColor,
  bottomColor,
  isDark = false,
  defaultColors,
}: GradientColorPickerProps) {
  const labelColor = '#ffffff'; // White text for visibility on dark glass

  return (
    <div className="w-full max-w-4xl">
      <div className="grid grid-cols-1 gap-3">
        {/* Top color picker */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: labelColor }}>
            Top Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={topColor}
              onChange={(e) => onTopColorChange(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0"
              style={{
                background: 'transparent',
                padding: 0,
              }}
            />
            <input
              type="text"
              value={topColor}
              onChange={(e) => onTopColorChange(e.target.value)}
              className="flex-1 px-2 py-1.5 text-xs rounded border-0 font-mono outline-none"
              style={{
                color: labelColor,
                background: 'rgba(0, 0, 0, 0.4)',
              }}
              placeholder={defaultColors.top}
            />
          </div>
        </div>

        {/* Upper Middle color picker */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: labelColor }}>
            Upper Middle Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={upperMiddleColor}
              onChange={(e) => onUpperMiddleColorChange(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0"
              style={{
                background: 'transparent',
                padding: 0,
              }}
            />
            <input
              type="text"
              value={upperMiddleColor}
              onChange={(e) => onUpperMiddleColorChange(e.target.value)}
              className="flex-1 px-2 py-1.5 text-xs rounded border-0 font-mono outline-none"
              style={{
                color: labelColor,
                background: 'rgba(0, 0, 0, 0.4)',
              }}
              placeholder={defaultColors.upperMiddle}
            />
          </div>
        </div>

        {/* Lower Middle color picker */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: labelColor }}>
            Lower Middle Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={lowerMiddleColor}
              onChange={(e) => onLowerMiddleColorChange(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0"
              style={{
                background: 'transparent',
                padding: 0,
              }}
            />
            <input
              type="text"
              value={lowerMiddleColor}
              onChange={(e) => onLowerMiddleColorChange(e.target.value)}
              className="flex-1 px-2 py-1.5 text-xs rounded border-0 font-mono outline-none"
              style={{
                color: labelColor,
                background: 'rgba(0, 0, 0, 0.4)',
              }}
              placeholder={defaultColors.lowerMiddle}
            />
          </div>
        </div>

        {/* Bottom color picker */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: labelColor }}>
            Bottom Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={bottomColor}
              onChange={(e) => onBottomColorChange(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0"
              style={{
                background: 'transparent',
                padding: 0,
              }}
            />
            <input
              type="text"
              value={bottomColor}
              onChange={(e) => onBottomColorChange(e.target.value)}
              className="flex-1 px-2 py-1.5 text-xs rounded border-0 font-mono outline-none"
              style={{
                color: labelColor,
                background: 'rgba(0, 0, 0, 0.4)',
              }}
              placeholder={defaultColors.bottom}
            />
          </div>
        </div>

        {/* All colors in one line for copy/paste */}
        <div className="mt-4">
          <label className="block text-xs font-medium mb-1" style={{ color: labelColor }}>
            All Colors (Copy/Paste)
          </label>
          <input
            type="text"
            value={`${topColor} ${upperMiddleColor} ${lowerMiddleColor} ${bottomColor}`}
            readOnly
            onClick={(e) => e.currentTarget.select()}
            className="w-full px-2 py-1.5 text-xs rounded border-0 font-mono outline-none cursor-text"
            style={{
              color: labelColor,
              background: 'rgba(0, 0, 0, 0.4)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
