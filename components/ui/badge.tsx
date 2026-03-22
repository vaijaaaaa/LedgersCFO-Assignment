import * as React from "react";
import { cn } from "@/lib/utils";

const baseClass = "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium";
const variants: Record<string, string> = {
  default: "border-zinc-200 bg-zinc-100 text-zinc-700",
  overdue: "border-red-200 bg-red-50 text-red-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "overdue" | "success";
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(baseClass, variants[variant ?? "default"], className)} {...props} />;
}

export { Badge };
