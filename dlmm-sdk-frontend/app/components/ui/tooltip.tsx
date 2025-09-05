"use client";

import React, { createContext, useContext, useState } from "react";

type TooltipContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const TooltipContext = createContext<TooltipContextValue | null>(null);

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      {children}
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) {
  const ctx = useContext(TooltipContext);
  if (!ctx) return <>{children}</>;
  const triggerProps = {
    onMouseEnter: () => ctx.setOpen(true),
    onMouseLeave: () => ctx.setOpen(false),
    onFocus: () => ctx.setOpen(true),
    onBlur: () => ctx.setOpen(false),
  } as const;
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, triggerProps);
  }
  return (
    <div {...triggerProps}>
      {children}
    </div>
  );
}

export function TooltipContent({ children }: { children: React.ReactNode }) {
  const ctx = useContext(TooltipContext);
  if (!ctx) return null;
  return ctx.open ? (
    <div className="mt-2 w-max rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-neutral-200 shadow-lg">
      {children}
    </div>
  ) : null;
}


