import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  prefix?: string;
  ariaLabel?: string;
  className?: string;
  size?: "sm" | "md";
  disabled?: boolean;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  prefix,
  ariaLabel,
  className = "",
  size = "md",
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];
  const heightClass = size === "sm" ? "min-h-[32px] h-8 px-2.5 text-[11px]" : "min-h-[40px] px-3.5 text-xs";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || prefix || "Select option"}
        className={`w-full ${heightClass} bg-white dark:bg-[#191816] border rounded-md flex items-center justify-between gap-2 font-medium text-slate-900 dark:text-slate-100 transition-colors cursor-pointer disabled:opacity-50 ${
          isOpen
            ? "border-slate-950 dark:border-slate-100 ring-1 ring-slate-950 dark:ring-slate-100"
            : "border-slate-200 dark:border-slate-800 hover:border-slate-400"
        }`}
      >
        <span className="truncate">
          {prefix && <span className="text-slate-500 font-normal mr-1">{prefix}:</span>}
          <span>{selectedOption?.label}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-slate-900 dark:text-slate-100" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-1 shadow-lg z-50 max-h-60 overflow-y-auto space-y-0.5"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full min-h-[34px] px-3 py-1.5 text-left text-xs rounded-sm flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-slate-50 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-950 dark:hover:text-slate-50"
                }`}
              >
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
