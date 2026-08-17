import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Plus, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  options: (SelectOption | string)[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  allowCustom?: boolean;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  placeholder = 'انتخاب یا تایپ کنید...',
  options = [],
  value = '',
  onChange,
  disabled = false,
  allowCustom = true,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize options array into SelectOption format
  const normalizedOptions: SelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchTerm = (value || '').trim().toLowerCase();

  const filteredOptions = normalizedOptions.filter(
    (o) =>
      !searchTerm ||
      o.label.toLowerCase().includes(searchTerm) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(searchTerm))
  );

  const exactMatch = normalizedOptions.some(
    (o) => o.label.toLowerCase() === searchTerm || o.value.toLowerCase() === searchTerm
  );

  return (
    <div ref={dropdownRef} className={`relative text-right dir-rtl ${className}`}>
      {label && (
        <label dir="rtl" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-right">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          type="text"
          disabled={disabled}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pr-3.5 pl-16 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F0F12] text-xs sm:text-sm text-slate-900 dark:text-white font-bold text-right focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <div className="absolute left-2.5 top-2.5 flex items-center gap-1 text-slate-400">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(true);
              }}
              className="p-1 hover:text-slate-600 dark:hover:text-white rounded-md transition-colors cursor-pointer"
              title="پاک کردن"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:text-slate-600 dark:hover:text-white rounded-md transition-colors cursor-pointer"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute right-0 left-0 top-full mt-1.5 z-50 p-2 rounded-xl bg-white dark:bg-[#16161A] border border-slate-200 dark:border-white/10 shadow-2xl space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value || opt.label === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-right px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <span className="truncate text-right">{opt.label}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {opt.sublabel && <span className="text-[10px] text-slate-400 font-normal">{opt.sublabel}</span>}
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-500" />}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-3 text-center text-xs text-slate-400">
              {value && allowCustom ? (
                <div className="text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center gap-1.5 py-1">
                  <Plus className="w-4 h-4" />
                  <span>عنوان جدید «{value}» به صورت دستی ثبت می‌شود</span>
                </div>
              ) : (
                <p>موردی در لیست یافت نشد</p>
              )}
            </div>
          )}

          {allowCustom && value && !exactMatch && filteredOptions.length > 0 && (
            <div className="pt-1 mt-1 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full text-right px-3 py-1.5 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>استفاده از «{value}» به عنوان نام جدید</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

