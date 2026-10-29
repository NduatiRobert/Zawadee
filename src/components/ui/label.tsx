import * as React from "react";

import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(function Label({ className, ...props }, ref) {
  return (
    <label
      ref={ref}
      className={cn(
        "text-foreground text-sm font-medium peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
});
