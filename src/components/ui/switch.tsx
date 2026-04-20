import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      // Unchecked state - more visible gray
      "data-[state=unchecked]:bg-muted-foreground/30 data-[state=unchecked]:border-muted-foreground/40",
      // Checked state - primary with glow
      "data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:shadow-[0_0_8px_hsl(var(--primary)/0.4)]",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full shadow-md ring-0 transition-all duration-200",
        // Unchecked thumb
        "data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-background",
        // Checked thumb - white with subtle shadow
        "data-[state=checked]:translate-x-5 data-[state=checked]:bg-primary-foreground data-[state=checked]:shadow-lg"
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };