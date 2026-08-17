import React from 'react';
import { formatNumberWithCommas } from '../utils/calculator.ts';

function toEnglishDigits(str: string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['0', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), String(i));
    result = result.replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }
  return result;
}

interface FormattedNumberInputProps {
  label?: string;
  value: number | undefined | null;
  onChange: (val: number) => void;
  placeholder?: string;
  unit?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'وارد کنید...',
  unit,
  required = false,
  disabled = false,
  className = '',
}) => {
  const displayValue = value !== undefined && value !== null && value !== 0 ? formatNumberWithCommas(value) : '';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (!rawVal) {
      onChange(0);
      return;
    }
    // Remove non-numeric chars except digits
    const cleanDigits = toEnglishDigits(rawVal).replace(/[^0-9]/g, '');
    const num = parseInt(cleanDigits, 10);
    onChange(isNaN(num) ? 0 : num);
  };

  return (
    <div className={`text-right dir-rtl ${className}`}>
      {label && (
        <label dir="rtl" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-right">
          {label} {required && <span className="text-amber-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          disabled={disabled}
          value={displayValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full pr-3.5 pl-16 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs sm:text-sm text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60 transition-all outline-none text-right disabled:opacity-50"
        />
        {unit && (
          <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};
