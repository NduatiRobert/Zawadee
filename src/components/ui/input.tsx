import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, type = "text", ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "border-border bg-card flex h-11 w-full rounded-md border px-3 py-2 text-base",
        "placeholder:text-muted-foreground",
        "focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-critical",
        className,
      )}
      {...props}
    />
  );
});
