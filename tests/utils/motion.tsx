import { type ComponentProps, type ReactNode, forwardRef } from "react";

type Props = ComponentProps<"div"> & {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  layout?: unknown;
};
export const AnimatePresence = ({ children }: { children?: ReactNode }) => <>{children}</>;
const MotionDiv = forwardRef<HTMLDivElement, Props>(
  (
    {
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      layout: _layout,
      ...props
    },
    ref,
  ) => <div ref={ref} {...props} />,
);
MotionDiv.displayName = "MotionDiv";
export const motion = { div: MotionDiv };
