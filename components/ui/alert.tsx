import * as React from "react";
import { cn } from "@/lib/utils";

function Alert({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("relative w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700", className)} role="alert" {...props} />;
}

export { Alert };
