"use client";

import { useState, useRef, useEffect } from "react";

type Option = {
  value: string;
  label: string;
};

type CustomSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  className?: string;
};

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  className = "",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      style={{ zIndex: isOpen ? 50 : 10 }}
    >
      {/* Select Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        suppressHydrationWarning
        className={`flex items-center justify-between w-full h-9 px-3 text-sm font-sans bg-surface-card text-ink border ${
          isOpen ? "border-primary ring-1 ring-primary" : "border-hairline"
        } rounded-md cursor-pointer outline-none transition-all select-none shadow-sm`}
      >
        <span className="truncate flex items-center h-full">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 ml-2 text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Select Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 mt-1 bg-surface-card border border-primary rounded-md shadow-lg overflow-hidden z-[100] animate-in fade-in slide-in-from-top-1 duration-100 ring-1 ring-primary"
          style={{ width: "100%" }}
        >
          <div className="max-h-60 overflow-y-auto py-1">
            {/* Placeholder/All Option */}
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className={`flex items-center w-full h-9 px-3 text-left text-sm font-sans transition-colors outline-none focus:bg-canvas-soft ${
                value === ""
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-ink hover:bg-canvas-soft"
              }`}
            >
              <span className="truncate">{placeholder}</span>
            </button>

            {/* Options List */}
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex items-center w-full h-9 px-3 text-left text-sm font-sans transition-colors outline-none focus:bg-canvas-soft ${
                  value === opt.value
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-ink hover:bg-canvas-soft"
                }`}
              >
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
