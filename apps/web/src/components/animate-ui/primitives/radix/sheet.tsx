'use client';

import * as React from 'react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { AnimatePresence, motion, type HTMLMotionProps } from 'motion/react';

import { getStrictContext } from '@/lib/get-strict-context';
import { useControlledState } from '@/hooks/use-controlled-state';

type SheetContextType = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
};

const [SheetProvider, useSheet] = getStrictContext<SheetContextType>('SheetContext');

type SheetProps = React.ComponentProps<typeof SheetPrimitive.Root>;

function Sheet(props: SheetProps) {
  const [isOpen, setIsOpen] = useControlledState({
    ...(props.open !== undefined ? { value: props.open } : {}),
    ...(props.defaultOpen !== undefined ? { defaultValue: props.defaultOpen } : {}),
    ...(props.onOpenChange !== undefined ? { onChange: props.onOpenChange } : {}),
  });

  return (
    <SheetProvider value={{ isOpen, setIsOpen }}>
      <SheetPrimitive.Root data-slot="sheet" {...props} onOpenChange={setIsOpen} />
    </SheetProvider>
  );
}

type SheetTriggerProps = React.ComponentProps<typeof SheetPrimitive.Trigger>;

function SheetTrigger(props: SheetTriggerProps) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

type SheetCloseProps = React.ComponentProps<typeof SheetPrimitive.Close>;

function SheetClose(props: SheetCloseProps) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

type SheetPortalProps = React.ComponentProps<typeof SheetPrimitive.Portal>;

function SheetPortal(props: SheetPortalProps) {
  const { isOpen } = useSheet();

  return (
    <AnimatePresence>
      {isOpen && <SheetPrimitive.Portal forceMount data-slot="sheet-portal" {...props} />}
    </AnimatePresence>
  );
}

type SheetOverlayProps = Omit<
  React.ComponentProps<typeof SheetPrimitive.Overlay>,
  'asChild' | 'forceMount'
> &
  HTMLMotionProps<'div'>;

const MotionOverlay = React.forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>((props, ref) => (
  <motion.div ref={ref} {...props} />
));
MotionOverlay.displayName = 'MotionOverlay';

const MotionContent = React.forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>((props, ref) => (
  <motion.div ref={ref} {...props} />
));
MotionContent.displayName = 'MotionContent';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- radix render prop is supported at runtime but missing from @radix-ui/react-dialog types
const OverlayWithRender = SheetPrimitive.Overlay as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- radix render prop + exactOptionalPropertyTypes conflicts with motion prop spread
const ContentWithRender = SheetPrimitive.Content as any;

const SheetOverlay = React.forwardRef<HTMLDivElement, SheetOverlayProps>(
  ({ transition = { duration: 0.2, ease: 'easeInOut' }, ...props }, _ref) => (
    <OverlayWithRender
      forceMount
      render={
        <MotionOverlay
          key="sheet-overlay"
          data-slot="sheet-overlay"
          initial={{ opacity: 0, filter: 'blur(4px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(4px)' }}
          transition={transition}
          {...props}
        />
      }
    />
  )
);
SheetOverlay.displayName = 'SheetOverlay';

type Side = 'top' | 'bottom' | 'left' | 'right';

type SheetContentProps = React.ComponentProps<typeof SheetPrimitive.Content> &
  HTMLMotionProps<'div'> & {
    side?: Side;
  };

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  (
    {
      side = 'right',
      transition = { type: 'spring', stiffness: 150, damping: 22 },
      style,
      children,
      ...props
    },
    _ref
  ) => {
    const axis = side === 'left' || side === 'right' ? 'x' : 'y';

    const offscreen: Record<Side, { x?: string; y?: string; opacity: number }> = {
      right: { x: '100%', opacity: 0 },
      left: { x: '-100%', opacity: 0 },
      top: { y: '-100%', opacity: 0 },
      bottom: { y: '100%', opacity: 0 },
    };

    const positionStyle: Record<Side, React.CSSProperties> = {
      right: { insetBlock: 0, right: 0 },
      left: { insetBlock: 0, left: 0 },
      top: { insetInline: 0, top: 0 },
      bottom: { insetInline: 0, bottom: 0 },
    };

    return (
      <ContentWithRender
        forceMount
        {...props}
        render={
          <MotionContent
            key="sheet-content"
            data-slot="sheet-content"
            data-side={side}
            initial={offscreen[side]}
            animate={{ [axis]: 0, opacity: 1 }}
            exit={offscreen[side]}
            style={
              {
                position: 'fixed',
                ...positionStyle[side],
                ...style,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any
            }
            transition={transition}
          />
        }
      >
        {children}
      </ContentWithRender>
    );
  }
);
SheetContent.displayName = 'SheetContent';

type SheetHeaderProps = React.ComponentProps<'div'>;

function SheetHeader(props: SheetHeaderProps) {
  return <div data-slot="sheet-header" {...props} />;
}

type SheetFooterProps = React.ComponentProps<'div'>;

function SheetFooter(props: SheetFooterProps) {
  return <div data-slot="sheet-footer" {...props} />;
}

type SheetTitleProps = React.ComponentProps<typeof SheetPrimitive.Title>;

function SheetTitle(props: SheetTitleProps) {
  return <SheetPrimitive.Title data-slot="sheet-title" {...props} />;
}

type SheetDescriptionProps = React.ComponentProps<typeof SheetPrimitive.Description>;

function SheetDescription(props: SheetDescriptionProps) {
  return <SheetPrimitive.Description data-slot="sheet-description" {...props} />;
}

export {
  useSheet,
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  type SheetProps,
  type SheetPortalProps,
  type SheetOverlayProps,
  type SheetTriggerProps,
  type SheetCloseProps,
  type SheetContentProps,
  type SheetHeaderProps,
  type SheetFooterProps,
  type SheetTitleProps,
  type SheetDescriptionProps,
};
