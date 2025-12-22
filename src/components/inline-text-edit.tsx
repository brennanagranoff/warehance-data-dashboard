"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, X, Pencil } from "lucide-react";

interface InlineTextEditProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  className?: string;
  placeholder?: string;
}

export function InlineTextEdit({ value, onSave, className, placeholder = "Enter text..." }: InlineTextEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (inputValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(inputValue);
    } catch (error) {
      console.error("Save failed:", error);
      setInputValue(value);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setInputValue(value);
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
          placeholder={placeholder}
          className={cn(
            "w-full rounded border px-2 py-1 text-sm",
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
      onClick={() => setIsEditing(true)}
      className={cn(
        "group flex items-center gap-1 rounded px-1 text-left hover:bg-muted",
        className
      )}
    >
      <span className={cn(!value && "text-muted-foreground")}>{value || placeholder}</span>
      <Pencil className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-50" />
    </button>
  );
}

