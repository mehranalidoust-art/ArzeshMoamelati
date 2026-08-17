import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, ZoomIn, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

interface ImageAttachmentUploaderProps {
  value?: string;
  onChange: (base64Url: string | undefined) => void;
  label?: string;
  description?: string;
  maxDimension?: number;
  quality?: number;
}

export const ImageAttachmentUploader: React.FC<ImageAttachmentUploaderProps> = ({
  value,
  onChange,
  label = 'پیوست تصویر نقشه، سند یا عکس ملک / بلوک',
  description = 'پشتیبانی از فرمت‌های JPG، PNG و WEBP (فشرده‌سازی هوشمند خودکار)',
  maxDimension = 1600,
  quality = 0.85,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compress & convert file to Base64
  const processImageFile = (file: File) => {
    setErrorMessage(null);

    // Validate type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('لطفاً یک فایل تصویری معتبر (JPG, PNG, WebP) انتخاب فرمایید.');
      return;
    }

    // Check raw file size limit (e.g. 25MB)
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('حجم فایل انتخابی بیش از ۲۵ مگابایت است. لطفاً فایل کم‌حجم‌تری انتخاب کنید.');
      return;
    }

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onerror = () => {
      setIsProcessing(false);
      setErrorMessage('خطا در خواندن فایل از حافظه دستگاه.');
    };

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => {
        setIsProcessing(false);
        setErrorMessage('تصویر انتخابی ساختار نامعتبری دارد.');
      };

      img.onload = () => {
        try {
          // Calculate scaled dimensions
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            // Fallback to raw base64
            onChange(e.target?.result as string);
            setIsProcessing(false);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Export as compressed jpeg/webp
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          onChange(compressedDataUrl);
          setIsProcessing(false);
        } catch (err) {
          console.warn('Canvas compression fallback to direct reader:', err);
          onChange(e.target?.result as string);
          setIsProcessing(false);
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    onChange(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2 dir-rtl text-right">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          {label}
        </label>
        {value && (
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>تصویر پیوست شد</span>
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!value ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
              : 'border-slate-300 dark:border-white/15 hover:border-amber-500/60 bg-slate-50 dark:bg-[#16161A]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-sm">
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isProcessing ? 'در حال بهینه‌سازی و بارگذاری تصویر...' : 'کلیک کنید یا تصویر را به اینجا بکشید'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                {description}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              onClick={() => setIsZoomOpen(true)}
              className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-200 dark:bg-black shrink-0 border border-slate-300 dark:border-white/10 cursor-pointer group"
            >
              <img
                src={value}
                alt="پیوست"
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                <ZoomIn className="w-4 h-4" />
              </div>
            </div>

            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                تصویر نقشه / کروکی بارگذاری شده
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                بهینه‌سازی شده و آماده ذخیره در گزارش
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsZoomOpen(true)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
              title="مشاهده بزرگ‌نمایی"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="حذف تصویر"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Zoom Modal */}
      {isZoomOpen && value && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsZoomOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-black rounded-2xl overflow-hidden border border-white/20 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsZoomOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={value}
              alt="بزرگ‌نمایی تصویر"
              className="max-h-[85vh] max-w-full object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
