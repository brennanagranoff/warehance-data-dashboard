"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface ToggleSwitchProps {
  value: boolean;
  onToggle: (value: boolean) => Promise<void> | void;
  disabled?: boolean;
  size?: "sm" | "default";
}

export function ToggleSwitch({ value, onToggle, disabled = false, size = "default" }: ToggleSwitchProps) {
  const [isOn, setIsOn] = useState(value);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsOn(value);
  }, [value]);

  const handleClick = async () => {
    if (disabled || isLoading) return;
    
    const newValue = !isOn;
    setIsOn(newValue);
    setIsLoading(true);
    
    try {
      await onToggle(newValue);
    } catch {
      setIsOn(!newValue); // Revert on error
    } finally {
      setIsLoading(false);
    }
  };

  if (size === "sm") {
    return (
      <button
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded transition-colors",
          isOn
            ? "bg-green-100 text-green-600 hover:bg-green-200"
            : "bg-red-100 text-red-600 hover:bg-red-200",
          (disabled || isLoading) && "opacity-50 cursor-not-allowed"
        )}
      >
        {isOn ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        isOn
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-red-100 text-red-700 hover:bg-red-200",
        (disabled || isLoading) && "opacity-50 cursor-not-allowed"
      )}
    >
      {isOn ? (
        <>
          <Check className="h-3 w-3" />
          Yes
        </>
      ) : (
        <>
          <X className="h-3 w-3" />
          No
        </>
      )}
    </button>
  );
}

