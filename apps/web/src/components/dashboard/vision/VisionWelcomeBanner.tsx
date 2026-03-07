/**
 * VisionWelcomeBanner - Vision UI styled welcome/info banner with background image
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';

export interface VisionWelcomeBannerProps {
  title: string;
  subtitle: string;
  buttonText?: string;
  onButtonClick?: () => void;
  icon?: LucideIcon;
  className?: string;
}

export const VisionWelcomeBanner = React.memo<VisionWelcomeBannerProps>(
  ({ title, subtitle, buttonText = 'Learn More', onButtonClick, icon: Icon, className = '' }) => {
    return (
      <div
        className={`
        relative overflow-hidden
        backdrop-blur-xl
        border border-white/10
        rounded-[20px] shadow-lg
        p-6 lg:p-8
        ${className}
      `}
        style={{
          background:
            'linear-gradient(127.09deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)',
        }}
      >
        {/* Background gradient decoration */}
        <div
          className="absolute top-0 right-0 w-1/2 h-full opacity-20"
          style={{
            background:
              'radial-gradient(ellipse at top right, rgba(0, 117, 255, 0.4) 0%, transparent 70%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex items-center justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-white text-xl lg:text-2xl font-bold mb-2">{title}</h2>
            <p className="text-vision-text-secondary text-sm lg:text-base max-w-md">{subtitle}</p>
            {onButtonClick && (
              <button
                type="button"
                onClick={onButtonClick}
                className="
                mt-4 inline-flex items-center gap-2
                px-5 py-2.5 rounded-xl
                bg-vision-info text-white
                font-medium text-sm
                shadow-vision-brand
                hover:opacity-90 transition-opacity
                focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-navy-900
              "
              >
                {buttonText}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Icon decoration */}
          {Icon && (
            <div className="hidden lg:flex w-24 h-24 rounded-2xl bg-vision-info/20 items-center justify-center">
              <Icon className="w-12 h-12 text-brand" />
            </div>
          )}
        </div>
      </div>
    );
  }
);

VisionWelcomeBanner.displayName = 'VisionWelcomeBanner';

export default VisionWelcomeBanner;
