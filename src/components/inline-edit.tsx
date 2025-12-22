"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, X, Pencil } from "lucide-react";

interface InlineEditProps {
  value: number;
  onSave: (value: number) => Promise<void>;
  format?: "number" | "currency" | "rate" | "percent";
  className?: string;
}

export function InlineEdit({ value, onSave, format = "number", className }: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [displayValue, setDisplayValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatValue = (val: number): string => {
    switch (format) {
      case "currency":
        return `$${val.toLocaleString()}`;
      case "rate":
        return `$${val.toFixed(3)}`;
      case "percent":
        return `${(val * 100).toFixed(0)}%`;
      default:
        return val.toLocaleString();
    }
  };

  useEffect(() => {
    setDisplayValue(formatValue(value));
  }, [value, format]);

  const startEditing = () => {
    if (format === "percent") {
      setInputValue(String(value * 100));
    } else {
      setInputValue(String(value));
    }
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const rawValue = inputRef.current?.value ?? inputValue;
    let numValue = parseFloat(rawValue);
    
    if (isNaN(numValue)) {
      setIsEditing(false);
      return;
    }

    if (format === "percent") {
      numValue = numValue / 100;
    }

    setIsSaving(true);
    try {
      await onSave(numValue);
      setDisplayValue(formatValue(numValue));
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-20 rounded border px-2 py-1 text-sm",
            className
          )}
          disabled={isSaving}
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded p-1 text-green-600 hover:bg-green-50"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="rounded p-1 text-red-600 hover:bg-red-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startEditing}
      className={cn(
        "group flex items-center gap-1 rounded px-1 hover:bg-muted",
        className
      )}
    >
      <span>{displayValue}</span>
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" />
    </button>
  );
}

