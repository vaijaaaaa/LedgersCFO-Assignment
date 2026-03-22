"use client";

import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DropdownSelectOption {
  value: string;
  label: string;
}

interface DropdownSelectProps {
  id?: string;
  value: string;
  options: DropdownSelectOption[];
  placeholder?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

function DropdownSelect({
  id,
  value,
  options,
  placeholder,
  onValueChange,
  disabled,
}: DropdownSelectProps) {
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-9 w-full justify-between border-zinc-300 font-normal"
        >
          <span className="truncate">{selected?.label ?? placeholder ?? "Select"}</span>
          <ChevronDownIcon className="size-4 text-zinc-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56" align="start">
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { DropdownSelect };
