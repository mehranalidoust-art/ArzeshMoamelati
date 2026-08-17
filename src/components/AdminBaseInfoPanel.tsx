import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { BaseRateItem, UserProfile } from '../types.ts';
import { formatNumberWithCommas } from '../utils/calculator.ts';
import { getAuthToken } from '../utils/authClient.ts';
import { SearchableSelect, SelectOption } from './SearchableSelect.tsx';
import { FormattedNumberInput } from './FormattedNumberInput.tsx';
import { ImageAttachmentUploader } from './ImageAttachmentUploader.tsx';
import {
  ShieldAlert,
  Plus,
  Upload,
  Download,
  FileSpreadsheet,
  Trash2,
  Edit,
  TrendingUp,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Database,
  Users,
  Building,
  X,
  Save,
  ImageIcon,
  MapPin,
  Layers,
  FileText,
  Percent,
  Check,
  RotateCcw,
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';

interface AdminBaseInfoPanelProps {
  user: UserProfile | null;
  baseRates: BaseRateItem[];
  onRefreshBaseRates: () => void;
}

export const AdminBaseInfoPanel: React.FC<AdminBaseInfoPanelProps> = ({
  user,
  baseRates,
  onRefreshBaseRates,
}) => {
  const [activeTab, setActiveTab] = useState<
    'rates' | 'excel' | 'usage_rates' | 'building_rates' | 'stages' | 'rules'
  >('rates');

  // Filters
  const [selectedProvince, setSelectedProvince] = useState<string>('همه');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('همه');
  const [selectedBlockFilter, setSelectedBlockFilter] = useState<string>('همه');
  const [selectedYear, setSelectedYear] = useState<number>(1403);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Rate Editing Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRate, setEditingRate] = useState<Partial<BaseRateItem> | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Rate Deletion In-App Modal State
  const [rateToDelete, setRateToDelete] = useState<BaseRateItem | null>(null);
  const [isDeletingRate, setIsDeletingRate] = useState<boolean>(false);

  // Batch deletion states (حذف انتخاب‌شده‌ها و حذف همه)
  const [selectedRateIds, setSelectedRateIds] = useState<number[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState<boolean>(false);
  const [deleteAllScope, setDeleteAllScope] = useState<'filtered' | 'all'>('filtered');
  const [deleteAllStep, setDeleteAllStep] = useState<1 | 2>(1);
  const [deleteAllConfirmAccepted, setDeleteAllConfirmAccepted] = useState<boolean>(false);
  const [isPerformingBatchDelete, setIsPerformingBatchDelete] = useState<boolean>(false);

  // Excel Import Preview State (All 5 Sheets)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [excelPreviewData, setExcelPreviewData] = useState<any[]>([]);
  const [excelUsageRates, setExcelUsageRates] = useState<any[]>([]);
  const [excelBuildingRates, setExcelBuildingRates] = useState<any[]>([]);
  const [excelStages, setExcelStages] = useState<any[]>([]);
  const [excelRules, setExcelRules] = useState<any[]>([]);
  const [detectedSheets, setDetectedSheets] = useState<string[]>([]);
  const [activePreviewSubTab, setActivePreviewSubTab] = useState<
    'blocks' | 'usage' | 'building' | 'stages' | 'rules'
  >('blocks');
  const [targetImportProvince, setTargetImportProvince] = useState<string>('گیلان');
  const [targetImportCity, setTargetImportCity] = useState<string>('خشکبیجار');
  const [targetImportYear, setTargetImportYear] = useState<number>(1403);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // System Settings State (For Usage, Building, Stages, Rules management)
  const [systemSettings, setSystemSettings] = useState<{
    usage_rates: any[];
    building_rates: any[];
    construction_stages: any[];
    regulations: any[];
  }>({
    usage_rates: [],
    building_rates: [],
    construction_stages: [],
    regulations: [],
  });
  const [isSavingSetting, setIsSavingSetting] = useState<boolean>(false);

  // Prediction State
  const [targetPredictYear, setTargetPredictYear] = useState<number>(1404);
  const [basePredictYear, setBasePredictYear] = useState<number>(1403);
  const [inflationPercent, setInflationPercent] = useState<number>(35);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);

  // Image zoom modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Notice
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Extract unique provinces
  const existingProvinces = Array.from(new Set(baseRates.map((r) => r.province)));
  const provincesList = ['همه', ...existingProvinces];

  // Fetch system settings on mount
  const fetchSystemSettings = async () => {
    try {
      const res = await fetch('/api/system-settings');
      if (res.ok) {
        const data = await res.json();
        setSystemSettings({
          usage_rates: data.usage_rates?.data || [],
          building_rates: data.building_rates?.data || [],
          construction_stages: data.construction_stages?.data || [],
          regulations: data.regulations?.data || [],
        });
      }
    } catch (err) {
      console.error('Error fetching system settings:', err);
    }
  };

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  const handleOpenAddModal = () => {
    setModalError(null);
    setEditingRate({
      province: selectedProvince !== 'همه' ? selectedProvince : (existingProvinces[0] || 'گیلان'),
      city: selectedCityFilter !== 'همه' ? selectedCityFilter : 'رشت',
      blockCode: '۱۲',
      partCode: '۱',
      sectionName: '',
      address: '',
      year: selectedYear || 1403,
      baseLandValue: 460000000,
      baseLandCommercialValue: 820000000,
      baseBuildingConcrete: 26000000,
      baseBuildingOther: 8500000,
      notes: '',
      imageUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rate: BaseRateItem) => {
    setModalError(null);
    setEditingRate({ ...rate });
    setIsModalOpen(true);
  };

  const handleSaveRate = async () => {
    setModalError(null);
    if (!editingRate?.province || !editingRate?.province.trim()) {
      setModalError('لطفاً نام استان را مشخص یا انتخاب کنید.');
      return;
    }
    if (!editingRate?.city || !editingRate?.city.trim()) {
      setModalError('لطفاً نام شهر یا منطقه را مشخص یا انتخاب کنید.');
      return;
    }
    if (!editingRate?.year) {
      setModalError('لطفاً سال دفترچه ارزش را وارد کنید.');
      return;
    }

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/base-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(editingRate),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'اطلاعات پایه با موفقیت ذخیره گردید.' });
        setIsModalOpen(false);
        onRefreshBaseRates();
      } else {
        const err = await res.json();
        setModalError(err.error || 'خطا در ذخیره نرخ پایه');
      }
    } catch (err) {
      console.error('Error saving base rate:', err);
      setModalError('خطا در ارتباط با سرور');
    }
  };

  const confirmDeleteRate = async () => {
    if (!rateToDelete) return;
    setIsDeletingRate(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/admin/base-rates/${rateToDelete.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        setMessage({
          type: 'success',
          text: `اطلاعات پایه بلوک ${rateToDelete.blockCode || '-'} (شهر ${rateToDelete.city}) با موفقیت حذف گردید.`,
        });
        setRateToDelete(null);
        onRefreshBaseRates();
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.error || 'خطا در حذف نرخ پایه از سرور' });
      }
    } catch (err) {
      console.error('Error deleting base rate:', err);
      setMessage({ type: 'error', text: 'خطا در برقراری ارتباط با سرور' });
    } finally {
      setIsDeletingRate(false);
    }
  };

  // Toggle selection of single rate row
  const handleToggleSelectRate = (id: number) => {
    setSelectedRateIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle selection of all filtered rates
  const handleToggleSelectAll = (filteredItems: BaseRateItem[]) => {
    const filteredIds = filteredItems.map((r) => r.id);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id) => selectedRateIds.includes(id));
    if (allSelected) {
      setSelectedRateIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedRateIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Bulk Delete Selected Rates
  const confirmBulkDeleteRates = async () => {
    if (selectedRateIds.length === 0) return;
    setIsPerformingBatchDelete(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/base-rates/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ids: selectedRateIds }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({
          type: 'success',
          text: data.message || `${selectedRateIds.length} ردیف انتخابی با موفقیت حذف گردید.`,
        });
        setSelectedRateIds([]);
        setIsBulkDeleteModalOpen(false);
        onRefreshBaseRates();
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.error || 'خطا در حذف رکوردهای انتخابی' });
      }
    } catch (err) {
      console.error('Error deleting bulk rates:', err);
      setMessage({ type: 'error', text: 'خطا در برقراری ارتباط با سرور' });
    } finally {
      setIsPerformingBatchDelete(false);
    }
  };

  // Delete All Rates (by Scope: Filtered or Global All)
  const confirmDeleteAllRates = async () => {
    setIsPerformingBatchDelete(true);
    try {
      const token = await getAuthToken();
      const payload =
        deleteAllScope === 'all'
          ? { deleteAll: true }
          : {
              province: selectedProvince !== 'همه' ? selectedProvince : undefined,
              city: selectedCityFilter !== 'همه' ? selectedCityFilter : undefined,
              year: selectedYear,
            };

      const res = await fetch('/api/admin/base-rates/delete-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({
          type: 'success',
          text: data.message || 'اطلاعات بلوک‌ها و معابر با موفقیت حذف گردید.',
        });
        setSelectedRateIds([]);
        setIsDeleteAllModalOpen(false);
        setDeleteAllStep(1);
        setDeleteAllConfirmAccepted(false);
        onRefreshBaseRates();
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.error || 'خطا در حذف کلی اطلاعات' });
      }
    } catch (err) {
      console.error('Error in delete-all base rates:', err);
      setMessage({ type: 'error', text: 'خطا در برقراری ارتباط با سرور' });
    } finally {
      setIsPerformingBatchDelete(false);
    }
  };

  // Helper to parse numbers from Persian Excel sheets (handling commas, slashes, Persian digits, and currency text)
  const parsePersianExcelNumber = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') {
      return isNaN(val) ? 0 : val;
    }
    let str = String(val).trim();
    if (!str) return 0;

    // Convert Persian & Arabic digits to standard ASCII digits
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    for (let i = 0; i < 10; i++) {
      str = str.replaceAll(persianDigits[i], String(i)).replaceAll(arabicDigits[i], String(i));
    }

    // Remove zero-width spaces, invisible characters, and non-breaking spaces
    str = str.replace(/[\u200B-\u200D\uFEFF\u00A0\u200c]/g, '').trim();

    // Remove commas (thousand separators)
    str = str.replace(/,/g, '');

    // Remove Persian currency and percentage words
    str = str.replace(/(ریال|ريال|تومان|هزار|درصد|%|متر|مترمربع|sqm|rials)/gi, '').trim();

    // Handle Persian decimal slashes like '0/7' -> '0.7'
    if (str.includes('/') && !str.includes('.')) {
      str = str.replace('/', '.');
    }

    // If multiple dots like '28.500.000' (thousand separator dots), remove all dots except decimal if only one
    const dotCount = (str.match(/\./g) || []).length;
    if (dotCount > 1) {
      str = str.replace(/\./g, '');
    }

    // Keep only digits, minus, and dot
    str = str.replace(/[^0-9.-]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  // Tolerant helper to search for column values in a row object regardless of newlines (\r\n), spaces, or punctuation
  const findRowValue = (row: any, candidates: (string | RegExp)[]): any => {
    if (!row || typeof row !== 'object') return undefined;

    const keys = Object.keys(row);

    // 1. Direct exact key lookup
    for (const cand of candidates) {
      if (typeof cand === 'string' && row[cand] !== undefined && row[cand] !== null && row[cand] !== '') {
        return row[cand];
      }
    }

    const cleanStr = (s: string) =>
      s
        .replace(/[\r\n\t\u200c\u00a0\u200b-\u200d\ufeff]/g, ' ')
        .replace(/\s+/g, '')
        .replace(/[()\/\\_—\-:،,]/g, '')
        .toLowerCase();

    // 2. Normalized key lookup (removes newlines, whitespace, slashes, brackets)
    for (const key of keys) {
      if (row[key] === undefined || row[key] === null || row[key] === '') continue;
      const cleanKey = cleanStr(key);
      const rawCleanKey = key.replace(/[\r\n\t\u200c\u00a0]+/g, ' ').replace(/\s+/g, ' ').trim();

      for (const cand of candidates) {
        if (typeof cand === 'string') {
          const cleanCand = cleanStr(cand);
          if (cleanKey === cleanCand || cleanKey.includes(cleanCand) || cleanCand.includes(cleanKey)) {
            return row[key];
          }
        } else if (cand instanceof RegExp) {
          if (cand.test(rawCleanKey) || cand.test(key) || cand.test(cleanKey)) {
            return row[key];
          }
        }
      }
    }

    return undefined;
  };

  // Excel File Parsing Handler - Supports 5-sheet workbooks or single sheets
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        setDetectedSheets(wb.SheetNames);

        // Helper to match sheet name flexibly
        const findSheet = (keywords: string[], fallbackIndex?: number) => {
          const found = wb.SheetNames.find((s) => {
            const clean = s.replace(/[\s\u200c_-]+/g, '').toLowerCase();
            return keywords.some((k) => clean.includes(k.replace(/[\s\u200c_-]+/g, '').toLowerCase()));
          });
          if (found) return found;
          if (fallbackIndex !== undefined && wb.SheetNames[fallbackIndex]) {
            return wb.SheetNames[fallbackIndex];
          }
          return undefined;
        };

        // 1. Process Blocks sheet (بلوک‌ها / معابر)
        const blockSheetName = findSheet(
          ['بلوک', 'معابر', 'ارزش عرصه', 'عرصه', 'block', 'شیت1', 'شیت۱', 'sheet1'],
          0
        );
        let parsedBlocks: any[] = [];
        if (blockSheetName && wb.Sheets[blockSheetName]) {
          const ws = wb.Sheets[blockSheetName];
          const rawRows = XLSX.utils.sheet_to_json(ws);

          parsedBlocks = rawRows.map((row: any, idx: number) => {
            const rawBlock = findRowValue(row, [
              'بلوک',
              'کد بلوک',
              'شماره بلوک',
              'ردیف',
              'blockCode',
              'block_code',
              /بلوک/i,
            ]);

            const rawPart = findRowValue(row, [
              'کد قسمت',
              'قسمت',
              'شماره قسمت',
              'partCode',
              'part_code',
              /قسمت/i,
            ]) || '1';

            const sectionOrDesc = findRowValue(row, [
              'محدوده/شرح',
              'نام معبر و محدوده',
              'نام معبر',
              'عنوان معبر',
              'قسمت / معبر',
              'معبر',
              'شرح',
              'محدوده',
              'sectionName',
              'section_name',
              /معبر/i,
              /محدوده/i,
            ]) || '';

            const addressDetail = findRowValue(row, [
              'شرح نشانی',
              'نشانی',
              'آدرس',
              'address',
              /نشانی/i,
              /آدرس/i,
            ]) || sectionOrDesc;

            const residentialPrice = parsePersianExcelNumber(
              findRowValue(row, [
                'مسکونی (ریال)',
                'مسکونی',
                'قیمت پایه عرصه (P)',
                'قیمت پایه زمین',
                'ارزش پایه عرصه',
                'قیمت عرصه',
                'baseLandValue',
                'P',
                /مسکونی/i,
                /عرصه/i,
              ])
            );

            const adminPrice = parsePersianExcelNumber(
              findRowValue(row, [
                'اداری (ریال)',
                'اداری',
                'ارزش اداری',
                'قیمت اداری',
                /اداری/i,
              ])
            );

            let commercialPrice = parsePersianExcelNumber(
              findRowValue(row, [
                'تجاری (ریال)',
                'تجاری',
                'قیمت تجاری',
                'ارزش تجاری',
                'baseLandCommercialValue',
                /تجاری/i,
              ])
            );
            if (!commercialPrice && residentialPrice) {
              commercialPrice = Math.round(residentialPrice * 1.5);
            }

            let concreteBuilding = parsePersianExcelNumber(
              findRowValue(row, [
                'تمام بتن/اسکلت بتنی/فلزی/سوله (هزار ریال)',
                'تمام بتن/اسکلت بتنی/فلزی/سوله (ریال)',
                'تمام بتن/اسکلت بتنی/فلزی/سوله',
                'قیمت سازه بتنی و فلزی',
                'قیمت سازه بتنی',
                'سازه بتنی',
                'بتنی',
                'baseBuildingConcrete',
                /بتن/i,
                /فلز/i,
              ])
            );
            if (concreteBuilding > 0 && concreteBuilding <= 100000) {
              concreteBuilding = concreteBuilding * 1000;
            }
            if (!concreteBuilding) concreteBuilding = 24000000;

            let otherBuilding = parsePersianExcelNumber(
              findRowValue(row, [
                'سایر (هزار ریال)',
                'سایر (ریال)',
                'سایر سازه‌ها',
                'سایر سازه ها',
                'قیمت سایر سازه‌ها',
                'baseBuildingOther',
                /سایر/i,
              ])
            );
            if (otherBuilding > 0 && otherBuilding <= 100000) {
              otherBuilding = otherBuilding * 1000;
            }
            if (!otherBuilding) otherBuilding = 8000000;

            const parsedLandCoeff = parsePersianExcelNumber(
              findRowValue(row, [
                'ضریب عرصه',
                'ضریب زمین',
                'ضریب پایه عرصه',
                'ضریب کاربری عرصه',
                'ضریب مسکونی',
                'ضریب',
                'landCoeff',
                /ضریب.*عرصه/i,
                /ضریب.*زمین/i,
                /ضریب.*مسکونی/i,
              ])
            ) || 1.0;

            const resCoeff = findRowValue(row, ['ضریب مسکونی', /ضریب.*مسکونی/i]) || String(parsedLandCoeff);
            const admCoeff = findRowValue(row, ['ضریب اداری', /ضریب.*اداری/i]) || '1/2';
            const comCoeff = findRowValue(row, ['ضریب تجاری', /ضریب.*تجاری/i]) || '1/5';

            const parsedAdmCoeff = parsePersianExcelNumber(admCoeff) || 1.2;
            const parsedComCoeff = parsePersianExcelNumber(comCoeff) || 1.5;

            let notesText = findRowValue(row, ['توضیحات', 'ملاحظات', 'notes']) || '';
            if (!notesText && (adminPrice || commercialPrice)) {
              notesText = `ضریب اداری: ${admCoeff}${adminPrice ? ` (${formatNumberWithCommas(adminPrice)} ریال)` : ''} | ضریب تجاری: ${comCoeff} (${formatNumberWithCommas(commercialPrice)} ریال)`;
            }

            return {
              id: idx + 1,
              province: String(findRowValue(row, ['استان', 'province']) || targetImportProvince).trim(),
              city: String(findRowValue(row, ['شهر', 'منطقه', 'city']) || targetImportCity).trim(),
              blockCode: rawBlock !== undefined && rawBlock !== null ? String(rawBlock).trim() : String(idx + 1),
              partCode: String(rawPart).trim(),
              sectionName: String(sectionOrDesc).trim() || `بلوک ${rawBlock || idx + 1}`,
              address: String(addressDetail).trim() || undefined,
              year: parseInt(String(findRowValue(row, ['سال', 'year']) || targetImportYear), 10),
              baseLandValue: residentialPrice || 12000000,
              baseLandCommercialValue: commercialPrice || 17500000,
              landCoeff: parsedLandCoeff,
              adminCoeff: parsedAdmCoeff,
              commercialCoeff: parsedComCoeff,
              baseBuildingConcrete: concreteBuilding,
              baseBuildingOther: otherBuilding,
              notes: notesText || 'ایمپورت شده از فایل اکسل ماده ۶۴',
              imageUrl: findRowValue(row, ['تصویر', 'لینک تصویر', 'imageUrl']) || undefined,
            };
          });
        }

        // 2. Process Usage Rates sheet (ضرایب کاربری)
        const usageSheetName = findSheet(
          ['ضرایب', 'کاربری', 'تعدیل', 'ضرایب کاربری', 'usage', 'شیت2', 'شیت۲', 'sheet2'],
          1
        );
        let parsedUsage: any[] = [];
        if (usageSheetName && wb.Sheets[usageSheetName]) {
          const wsUsage = wb.Sheets[usageSheetName];
          const rawUsage = XLSX.utils.sheet_to_json(wsUsage);

          parsedUsage = rawUsage
            .map((r: any) => {
              const usageTitle = String(
                findRowValue(r, [
                  'نوع کاربری',
                  'کاربری',
                  'عنوان',
                  'شرح',
                  'نام کاربری',
                  'usage',
                  /کاربری/i,
                  /عنوان/i,
                ]) || ''
              ).trim();

              let coeff = parsePersianExcelNumber(
                findRowValue(r, [
                  'ضریب تعدیل نسبت به ارزش مسکونی',
                  'ضریب تعدیل نسبت به مسکونی',
                  'ضریب تعدیل',
                  'ضریب',
                  'درصد',
                  'coeff',
                  'coefficient',
                  /ضریب/i,
                  /تعدیل/i,
                ]) || 1
              );

              // If entered as percentage (e.g. 70 instead of 0.7), convert to decimal
              if (coeff > 1 && coeff <= 100) {
                coeff = Math.round((coeff / 100) * 100) / 100;
              }

              const notesVal = String(findRowValue(r, ['توضیحات', 'ملاحظات', 'notes']) || '').trim();

              return {
                usage: usageTitle,
                coefficient: coeff || 1,
                notes: notesVal,
              };
            })
            .filter((x: any) => Boolean(x.usage));
        }

        // 3. Process Building Rates sheet (ارزش اعیانی) - Ultra-tolerant extractor
        const buildingSheetName = findSheet(
          [
            'اعیانی',
            'ارزش اعیانی',
            'اعیان',
            'سازه',
            'سازه‌ها',
            'ساختمان',
            'building',
            'ayani',
            'شیت3',
            'شیت۳',
            'sheet3',
          ],
          2
        );

        let parsedBuilding: any[] = [];
        if (buildingSheetName && wb.Sheets[buildingSheetName]) {
          const wsBuilding = wb.Sheets[buildingSheetName];
          const rawBuilding = XLSX.utils.sheet_to_json(wsBuilding);

          // Primary attempt: parse object rows with fuzzy header match
          parsedBuilding = rawBuilding
            .map((r: any) => {
              const usageTitle = String(
                findRowValue(r, [
                  'نوع کاربری اعیانی',
                  'نوع کاربری',
                  'کاربری اعیانی',
                  'کاربری',
                  'شرح کاربری',
                  'شرح',
                  'عنوان',
                  'نام کاربری',
                  'usage',
                  /کاربری/i,
                  /عنوان/i,
                ]) || ''
              ).trim();

              let concreteVal = parsePersianExcelNumber(
                findRowValue(r, [
                  'تمام بتن/اسکلت بتنی/فلزی/سوله (هزار ریال)',
                  'تمام بتن / اسکلت بتنی / فلزی / سوله (هزار ریال)',
                  'تمام بتن/اسکلت بتنی/فلزی/سوله (ریال)',
                  'تمام بتن / اسکلت بتنی / فلزی / سوله (ریال)',
                  'تمام بتن/اسکلت بتنی/فلزی/سوله',
                  'تمام بتن / اسکلت بتنی / فلزی / سوله',
                  'تمام بتن',
                  'اسکلت بتنی',
                  'اسکلت فلزی',
                  'سازه بتنی و فلزی',
                  'سازه بتنی',
                  'بتنی',
                  'فلزی',
                  'سوله',
                  'بتن',
                  'concrete',
                  /بتن/i,
                  /فلز/i,
                  /سوله/i,
                ])
              );

              let otherVal = parsePersianExcelNumber(
                findRowValue(r, [
                  'سایر (هزار ریال)',
                  'سایر (ریال)',
                  'سایر سازه‌ها (هزار ریال)',
                  'سایر سازه ها (هزار ریال)',
                  'سایر سازه‌ها (ریال)',
                  'سایر سازه ها (ریال)',
                  'سایر سازه‌ها',
                  'سایر سازه ها',
                  'قیمت سایر سازه‌ها',
                  'سایر انواع سازه',
                  'سایر',
                  'other',
                  /سایر/i,
                  /سنتی/i,
                  /بنایی/i,
                  /آجری/i,
                ])
              );

              // Auto-convert from "Thousand Rials" (هزار ریال) if values are entered in thousands
              // In Iran tax tables, numbers like 28500, 24000, 15400, 6800, 8000, 17200, 6300, 3400 represent thousand Rials (<= 100,000)
              if (concreteVal > 0 && concreteVal <= 100000) {
                concreteVal = concreteVal * 1000;
              }
              if (otherVal > 0 && otherVal <= 100000) {
                otherVal = otherVal * 1000;
              }

              // Fallback for unlabeled columns: search across all properties in r for numbers
              if (concreteVal === 0 && otherVal === 0) {
                const numericVals: number[] = [];
                Object.entries(r).forEach(([key, v]) => {
                  if (key !== '__rowNum__' && typeof v !== 'object') {
                    const parsed = parsePersianExcelNumber(v);
                    if (parsed > 0) {
                      numericVals.push(parsed <= 100000 ? parsed * 1000 : parsed);
                    }
                  }
                });
                if (numericVals.length > 0) concreteVal = numericVals[0];
                if (numericVals.length > 1) otherVal = numericVals[1];
              }

              const notesVal = String(findRowValue(r, ['توضیحات', 'ملاحظات', 'notes']) || '').trim();

              return {
                usage: usageTitle,
                concrete: concreteVal,
                other: otherVal,
                notes: notesVal,
              };
            })
            .filter((x: any) => Boolean(x.usage || x.concrete > 0 || x.other > 0));

          // 2D Array Fallback if standard parsing yielded no valid numbers
          const hasZeroValues = parsedBuilding.length === 0 || parsedBuilding.every((b) => b.concrete === 0 && b.other === 0);
          if (hasZeroValues) {
            const raw2D = XLSX.utils.sheet_to_json(wsBuilding, { header: 1 }) as any[][];
            const fallbackRows: any[] = [];

            for (const rowArr of raw2D) {
              if (!Array.isArray(rowArr) || rowArr.length === 0) continue;
              const textCells: string[] = [];
              const numCells: number[] = [];

              for (const cell of rowArr) {
                if (cell === undefined || cell === null || cell === '') continue;
                const parsedNum = parsePersianExcelNumber(cell);
                const str = String(cell).trim();
                // Check if it's pure text (not headers)
                if (
                  isNaN(Number(str.replace(/,/g, ''))) &&
                  !str.includes('هزار ریال') &&
                  !str.includes('ردیف') &&
                  !str.includes('کاربری') &&
                  !str.includes('تمام بتن')
                ) {
                  textCells.push(str);
                }
                if (parsedNum > 0) {
                  numCells.push(parsedNum <= 100000 ? parsedNum * 1000 : parsedNum);
                }
              }

              if (textCells.length > 0 && numCells.length > 0) {
                fallbackRows.push({
                  usage: textCells[0],
                  concrete: numCells[0] || 0,
                  other: numCells[1] || 0,
                  notes: textCells[1] || '',
                });
              }
            }

            if (fallbackRows.length > 0) {
              parsedBuilding = fallbackRows;
            }
          }
        }

        // 4. Process Construction Stages sheet (مراحل ساخت)
        const stageSheetName = findSheet(
          ['مراحل', 'مرحله', 'پیشرفت', 'ساخت', 'مراحل ساخت', 'stage', 'شیت4', 'شیت۴', 'sheet4'],
          3
        );
        let parsedStages: any[] = [];
        if (stageSheetName && wb.Sheets[stageSheetName]) {
          const wsStage = wb.Sheets[stageSheetName];
          const rawStages = XLSX.utils.sheet_to_json(wsStage);

          parsedStages = rawStages
            .map((r: any) => {
              const stageTitle = String(
                findRowValue(r, [
                  'مرحله ساخت',
                  'مرحله',
                  'عنوان',
                  'شرح',
                  'stage',
                  /مرحله/i,
                  /ساخت/i,
                ]) || ''
              ).trim();

              let pct = parsePersianExcelNumber(
                findRowValue(r, [
                  'درصد از ارزش معاملاتی اعیانی',
                  'درصد ارزش اعیانی',
                  'درصد از ارزش',
                  'درصد ارزش',
                  'درصد',
                  'percentage',
                  /درصد/i,
                  /پیشرفت/i,
                ]) || 0
              );

              // If entered as 0.3 instead of 30, convert
              if (pct > 0 && pct <= 1) {
                pct = Math.round(pct * 100);
              }

              const notesVal = String(findRowValue(r, ['توضیحات', 'ملاحظات', 'notes']) || '').trim();

              return {
                stage: stageTitle,
                percentage: pct,
                notes: notesVal,
              };
            })
            .filter((x: any) => Boolean(x.stage));
        }

        // 5. Process Regulations sheet (ضوابط ماده ۶۴)
        const ruleSheetName = findSheet(
          ['ضوابط', 'ضابطه', 'قوانین', 'قانون', 'مقررات', 'rule', 'regulation', 'شیت5', 'شیت۵', 'sheet5'],
          4
        );
        let parsedRules: any[] = [];
        if (ruleSheetName && wb.Sheets[ruleSheetName]) {
          const wsRule = wb.Sheets[ruleSheetName];
          const rawRules = XLSX.utils.sheet_to_json(wsRule);

          parsedRules = rawRules
            .map((r: any, idx: number) => {
              const ruleId = parsePersianExcelNumber(
                findRowValue(r, ['ردیف', 'شماره', 'بند', 'id']) || idx + 1
              );

              const ruleTitle = String(
                findRowValue(r, [
                  'موضوع',
                  'عنوان',
                  'موضوع ضابطه',
                  'بند',
                  'title',
                  /موضوع/i,
                  /عنوان/i,
                ]) || `بند ${idx + 1}`
              ).trim();

              const ruleText = String(
                findRowValue(r, [
                  'ضابطه',
                  'متن ضابطه',
                  'شرح ضابطه',
                  'شرح',
                  'قانون',
                  'توضیحات',
                  'rule',
                  /ضابطه/i,
                  /قانون/i,
                  /شرح/i,
                ]) || ''
              ).trim();

              return {
                id: ruleId || idx + 1,
                title: ruleTitle,
                rule: ruleText,
              };
            })
            .filter((x: any) => Boolean(x.rule || x.title));
        }

        setExcelPreviewData(parsedBlocks);
        setExcelUsageRates(parsedUsage);
        setExcelBuildingRates(parsedBuilding);
        setExcelStages(parsedStages);
        setExcelRules(parsedRules);

        const summaryParts: string[] = [];
        if (parsedBlocks.length > 0) summaryParts.push(`${parsedBlocks.length} بلوک`);
        if (parsedUsage.length > 0) summaryParts.push(`${parsedUsage.length} ضریب کاربری`);
        if (parsedBuilding.length > 0) summaryParts.push(`${parsedBuilding.length} ارزش اعیانی`);
        if (parsedStages.length > 0) summaryParts.push(`${parsedStages.length} مرحله ساخت`);
        if (parsedRules.length > 0) summaryParts.push(`${parsedRules.length} ضابطه`);

        setImportStatus(`فایل با موفقیت بازخوانی شد: ${summaryParts.join('، ')} آماده ثبت در پایگاه داده می‌باشند.`);
      } catch (err) {
        console.error('Error reading Excel file:', err);
        setMessage({ type: 'error', text: 'خطا در خواندن فایل اکسل. لطفاً ساختار شیت‌ها و ستون‌ها را بررسی فرمایید.' });
      }
    };
    reader.readAsBinaryString(file);
  };

  // Cancel & Clear Uploaded File
  const handleCancelUpload = () => {
    setExcelPreviewData([]);
    setExcelUsageRates([]);
    setExcelBuildingRates([]);
    setExcelStages([]);
    setExcelRules([]);
    setDetectedSheets([]);
    setImportStatus(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Bulk Import Excel Data (All 5 Sheets) to Backend
  const handleBulkImportToDB = async () => {
    if (
      excelPreviewData.length === 0 &&
      excelUsageRates.length === 0 &&
      excelBuildingRates.length === 0 &&
      excelStages.length === 0 &&
      excelRules.length === 0
    ) {
      setMessage({ type: 'error', text: 'هیچ داده‌ای برای ذخیره‌سازی یافت نشد.' });
      return;
    }

    setIsImporting(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/base-rates/multi-sheet-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          rates: excelPreviewData,
          province: targetImportProvince,
          city: targetImportCity,
          year: targetImportYear,
          usageRates: excelUsageRates.length > 0 ? excelUsageRates : undefined,
          buildingRates: excelBuildingRates.length > 0 ? excelBuildingRates : undefined,
          stages: excelStages.length > 0 ? excelStages : undefined,
          rules: excelRules.length > 0 ? excelRules : undefined,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setMessage({
          type: 'success',
          text: result.message || 'تمامی شیت‌های اکسل با موفقیت در پایگاه داده ثبت و ذخیره گردیدند.',
        });

        // Automatically focus on the newly imported city and year in filters
        setSelectedProvince(targetImportProvince);
        setSelectedCityFilter(targetImportCity);
        setSelectedYear(targetImportYear);

        handleCancelUpload();
        onRefreshBaseRates();
        fetchSystemSettings();
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.error || 'خطا در ثبت اطلاعات در دیتابیس' });
      }
    } catch (err) {
      console.error('Error during bulk import:', err);
      setMessage({ type: 'error', text: 'خطا در برقراری ارتباط با دیتابیس' });
    } finally {
      setIsImporting(false);
    }
  };

  // Save manual changes to system settings (Usage, Building, Stages, Rules)
  const handleSaveSystemSetting = async (key: string, data: any) => {
    setIsSavingSetting(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/system-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          key,
          value: data,
          province: selectedProvince !== 'همه' ? selectedProvince : 'گیلان',
          city: selectedCityFilter !== 'همه' ? selectedCityFilter : 'خشکبیجار',
          year: selectedYear || 1403,
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'تغییرات با موفقیت در پایگاه داده ثبت شد.' });
        fetchSystemSettings();
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.error || 'خطا در ذخیره‌سازی تنظیمات' });
      }
    } catch (err) {
      console.error('Error saving system setting:', err);
      setMessage({ type: 'error', text: 'خطا در برقراری ارتباط با دیتابیس' });
    } finally {
      setIsSavingSetting(false);
    }
  };

  // Download 5-Sheet Standard Excel Template matching official tax book (خشکبیجار)
  const handleDownloadSampleTemplate = () => {
    const wb = XLSX.utils.book_new();

    // 1. Sheet: بلوکها
    const blocksData = [
      {
        ردیف: 1,
        بلوک: 1,
        قسمت: 1,
        'محدوده/شرح': 'از میدان شهرداری تا میدان شهید رجبعلی محمدی، بانضمام خیابان منتظری',
        'شرح نشانی': 'مرکز شهر - بلوک تجاری و اداری اصلی',
        'مسکونی (ریال)': 12000000,
        'اداری (ریال)': 14200000,
        'تجاری (ریال)': 17500000,
        'ضریب عرصه': 1.0,
        'ضریب مسکونی': 1.0,
        'ضریب اداری': 1.2,
        'ضریب تجاری': 1.5,
        'تمام بتن/اسکلت بتنی/فلزی/سوله (ریال)': 24000000,
        'سایر سازه‌ها (ریال)': 8000000,
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 2,
        بلوک: 2,
        قسمت: 1,
        'محدوده/شرح': 'از میدان شهید رجبعلی محمدی تا انتهای محدوده بخش خشکبیجار به سمت خمام، بانضمام خیابان آیت‌الله سعیدی و خیابان شهید حسن فهمیده',
        'شرح نشانی': 'محور خمام - مسکونی و تجاری خطی',
        'مسکونی (ریال)': 5500000,
        'اداری (ریال)': 6500000,
        'تجاری (ریال)': 8200000,
        'ضریب عرصه': 1.0,
        'ضریب مسکونی': 1.0,
        'ضریب اداری': 1.2,
        'ضریب تجاری': 1.5,
        'تمام بتن/اسکلت بتنی/فلزی/سوله (ریال)': 24000000,
        'سایر سازه‌ها (ریال)': 8000000,
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 3,
        بلوک: 3,
        قسمت: 1,
        'محدوده/شرح': 'از چهارراه شهید رضائی تا میدان شهید محسن نوشاددل',
        'شرح نشانی': 'محور شهید نوشاددل',
        'مسکونی (ریال)': 2400000,
        'اداری (ریال)': 2900000,
        'تجاری (ریال)': 3700000,
        'ضریب عرصه': 1.0,
        'ضریب مسکونی': 1.0,
        'ضریب اداری': 1.2,
        'ضریب تجاری': 1.5,
        'تمام بتن/اسکلت بتنی/فلزی/سوله (ریال)': 24000000,
        'سایر سازه‌ها (ریال)': 8000000,
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 4,
        بلوک: 4,
        قسمت: 1,
        'محدوده/شرح': 'از دانشگاه پیام نور تا چهارراه شهید رضائی، بانضمام خیابان صاحب‌الزمان و خیابان آیت‌الله مدرس',
        'شرح نشانی': 'محدوده دانشگاه و خیابان مدرس',
        'مسکونی (ریال)': 1900000,
        'اداری (ریال)': 2200000,
        'تجاری (ریال)': 2700000,
        'ضریب عرصه': 1.0,
        'ضریب مسکونی': 1.0,
        'ضریب اداری': 1.2,
        'ضریب تجاری': 1.5,
        'تمام بتن/اسکلت بتنی/فلزی/سوله (ریال)': 24000000,
        'سایر سازه‌ها (ریال)': 8000000,
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 5,
        بلوک: 5,
        قسمت: 1,
        'محدوده/شرح': 'از میدان شهید مظلومی تا میدان شهرداری، بانضمام خیابان شریعتی',
        'شرح نشانی': 'خیابان شریعتی و میدان مظلومی',
        'مسکونی (ریال)': 7400000,
        'اداری (ریال)': 8900000,
        'تجاری (ریال)': 11000000,
        'ضریب عرصه': 1.0,
        'ضریب مسکونی': 1.0,
        'ضریب اداری': 1.2,
        'ضریب تجاری': 1.5,
        'تمام بتن/اسکلت بتنی/فلزی/سوله (ریال)': 24000000,
        'سایر سازه‌ها (ریال)': 8000000,
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 6,
        بلوک: 6,
        قسمت: 1,
        'محدوده/شرح': 'از ابتدای محدوده بخش خشکبیجار از سمت لشت‌نشا (چهارراه رودپشت) تا دانشگاه پیام نور و روستاهای ضلع جنوبی جاده اصلی لشت‌نشا به خشکبیجار از قبیل مریدان، فرشم پایین و بالا و کوریجان',
        'شرح نشانی': 'محور لشت‌نشا - ضلع جنوبی',
        'مسکونی (ریال)': 2200000,
        'اداری (ریال)': 2500000,
        'تجاری (ریال)': 3200000,
        'ضریب عرصه': 1.0,
        'ضریب مسکونی': 1.0,
        'ضریب اداری': 1.2,
        'ضریب تجاری': 1.5,
        'تمام بتن/اسکلت بتنی/فلزی/سوله (ریال)': 24000000,
        'سایر سازه‌ها (ریال)': 8000000,
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 7,
        بلوک: 7,
        قسمت: 1,
        'محدوده/شرح': 'از میدان شهید محسن نوشاددل تا میدان شهید مظلومی، بانضمام بلوار ساحل',
        'شرح نشانی': 'بلوار ساحل',
        'مسکونی (ریال)': 6200000,
        'اداری (ریال)': 7400000,
        'تجاری (ریال)': 9200000,
        'ضریب عرصه': 1.0,
        'ضریب مسکونی': 1.0,
        'ضریب اداری': 1.2,
        'ضریب تجاری': 1.5,
        'تمام بتن/اسکلت بتنی/فلزی/سوله (ریال)': 24000000,
        'سایر سازه‌ها (ریال)': 8000000,
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 8,
        بلوک: 8,
        قسمت: 1,
        'محدوده/شرح': 'روستاهای واقع در ضلع شمالی جاده اصلی لشت‌نشا به خشکبیجار تا ابتدای محدوده بخش خمام، از قبیل شهرستان، جیرکویه، ولی‌آباد، گیلوا محله، چوکده، تمل، سیاه اسطلخ، سرخشکی، نوشر، جورکویه، شیشه گوراب، رودپشت، بسته دیم و غیره',
        'شرح نشانی': 'حوزه روستایی ضلع شمالی',
        'مسکونی (ریال)': 2400000,
        'اداری (ریال)': 2900000,
        'تجاری (ریال)': 3500000,
        'ضریب عرصه': 1.0,
        'ضریب مسکونی': 1.0,
        'ضریب اداری': 1.2,
        'ضریب تجاری': 1.5,
        'تمام بتن/اسکلت بتنی/فلزی/سوله (ریال)': 24000000,
        'سایر سازه‌ها (ریال)': 8000000,
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 9,
        بلوک: 9,
        قسمت: 1,
        'محدوده/شرح': 'ضلع شمالی نوار ساحلی بخش خشکبیجار، از ابتدای محدوده بخش خشکبیجار از سمت لشت‌نشا (روستای خشک اسطلخ) تا انتهای محدوده بخش خشکبیجار به سمت شهرستان انزلی (تا روستای جفرود)',
        'شرح نشانی': 'نوار ساحلی شمالی (گردشگری و ویلایی)',
        'مسکونی (ریال)': 11000000,
        'اداری (ریال)': 12700000,
        'تجاری (ریال)': 15900000,
        'ضریب عرصه': 1.0,
        'ضریب مسکونی': 1.0,
        'ضریب اداری': 1.2,
        'ضریب تجاری': 1.5,
        'تمام بتن/اسکلت بتنی/فلزی/سوله (ریال)': 24000000,
        'سایر سازه‌ها (ریال)': 8000000,
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 10,
        بلوک: 10,
        قسمت: 1,
        'محدوده/شرح': 'ضلع جنوبی نوار ساحلی بخش خشکبیجار، از ابتدای محدوده بخش خشکبیجار از سمت لشت‌نشا (روستای خشک اسطلخ) تا انتهای محدوده بخش خشکبیجار به سمت بخش لشت‌نشا/انزلی (تا روستای جفرود)',
        'شرح نشانی': 'نوار ساحلی جنوبی',
        'مسکونی (ریال)': 7200000,
        'اداری (ریال)': 8500000,
        'تجاری (ریال)': 10700000,
        'ضریب عرصه': 1.0,
        'ضریب مسکونی': 1.0,
        'ضریب اداری': 1.2,
        'ضریب تجاری': 1.5,
        'تمام بتن/اسکلت بتنی/فلزی/سوله (ریال)': 24000000,
        'سایر سازه‌ها (ریال)': 8000000,
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
    ];
    const ws1 = XLSX.utils.json_to_sheet(blocksData);
    ws1['!cols'] = [
      { wch: 6 }, // ردیف
      { wch: 8 }, // بلوک
      { wch: 8 }, // قسمت
      { wch: 45 }, // محدوده/شرح
      { wch: 30 }, // شرح نشانی
      { wch: 16 }, // مسکونی (ریال)
      { wch: 16 }, // اداری (ریال)
      { wch: 16 }, // تجاری (ریال)
      { wch: 12 }, // ضریب عرصه
      { wch: 12 }, // ضریب مسکونی
      { wch: 12 }, // ضریب اداری
      { wch: 12 }, // ضریب تجاری
      { wch: 28 }, // تمام بتن/اسکلت بتنی/فلزی/سوله (ریال)
      { wch: 20 }, // سایر سازه‌ها (ریال)
      { wch: 10 }, // استان
      { wch: 12 }, // شهر
      { wch: 8 }, // سال
    ];
    (ws1 as any)['!views'] = [{ rightToLeft: true }];
    XLSX.utils.book_append_sheet(wb, ws1, 'بلوکها');

    // 2. Sheet: ضرایب کاربری
    const usageData = [
      {
        ردیف: 1,
        'نوع کاربری': 'مسکونی',
        'ضریب تعدیل نسبت به ارزش مسکونی': 1.0,
        'درصد تعدیل': '%۱۰۰',
        'توضیحات و مصوبات': 'مبنای محاسبه ارزش پایه عرصه (ضریب ۱.۰)',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 2,
        'نوع کاربری': 'اداری',
        'ضریب تعدیل نسبت به ارزش مسکونی': 1.2,
        'درصد تعدیل': '%۱۲۰',
        'توضیحات و مصوبات': 'معادل ۱.۲ برابر ارزش عرصه مسکونی',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 3,
        'نوع کاربری': 'تجاری',
        'ضریب تعدیل نسبت به ارزش مسکونی': 1.5,
        'درصد تعدیل': '%۱۵۰',
        'توضیحات و مصوبات': 'معادل ۱.۵ برابر ارزش عرصه مسکونی',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 4,
        'نوع کاربری': 'خدماتی، آموزشی، فرهنگی، بهداشتی-درمانی، تفریحی-ورزشی، گردشگری، هتلداری و ...',
        'ضریب تعدیل نسبت به ارزش مسکونی': 0.7,
        'درصد تعدیل': '%۷۰',
        'توضیحات و مصوبات': 'معادل ۷۰٪ ارزش عرصه مسکونی',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 5,
        'نوع کاربری': 'صنعتی-کارگاهی، حمل‌ونقل، انبار و توقفگاه',
        'ضریب تعدیل نسبت به ارزش مسکونی': 0.6,
        'درصد تعدیل': '%۶۰',
        'توضیحات و مصوبات': 'معادل ۶۰٪ ارزش عرصه مسکونی',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 6,
        'نوع کاربری': 'کشاورزی: باغات، اراضی مزروعی آبی، دامداری، دامپروری، پرورش طیور و آبزیان، پرورش گل و گیاه و ...',
        'ضریب تعدیل نسبت به ارزش مسکونی': 0.2,
        'درصد تعدیل': '%۲۰',
        'توضیحات و مصوبات': 'معادل ۲۰٪ ارزش عرصه مسکونی',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 7,
        'نوع کاربری': 'کشاورزی: اراضی مزروعی دیمی',
        'ضریب تعدیل نسبت به ارزش مسکونی': 0.1,
        'درصد تعدیل': '%۱۰',
        'توضیحات و مصوبات': 'معادل ۱۰٪ ارزش عرصه مسکونی',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 8,
        'نوع کاربری': 'سایر کاربری‌ها (شامل اراضی فاقد کاربری و فاقد اعیانی)',
        'ضریب تعدیل نسبت به ارزش مسکونی': 0.2,
        'درصد تعدیل': '%۲۰',
        'توضیحات و مصوبات': 'طبق ردیف ۴ ضوابط (معادل ۲۰٪ ارزش عرصه مسکونی)',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
    ];
    const ws2 = XLSX.utils.json_to_sheet(usageData);
    ws2['!cols'] = [
      { wch: 6 }, // ردیف
      { wch: 55 }, // نوع کاربری
      { wch: 28 }, // ضریب تعدیل نسبت به ارزش مسکونی
      { wch: 14 }, // درصد تعدیل
      { wch: 45 }, // توضیحات و مصوبات
      { wch: 10 }, // استان
      { wch: 12 }, // شهر
      { wch: 8 }, // سال
    ];
    (ws2 as any)['!views'] = [{ rightToLeft: true }];
    XLSX.utils.book_append_sheet(wb, ws2, 'ضرایب کاربری');

    // 3. Sheet: ارزش اعیانی
    const buildingData = [
      {
        ردیف: 1,
        'نوع کاربری اعیانی': 'مسکونی و اداری',
        'تمام بتن/اسکلت بتنی/فلزی/سوله (ریال)': 24000000,
        'سایر سازه‌ها (ریال)': 8000000,
        توضیحات: 'ارزش هر مترمربع بنا بر مبنای ریال (مصوب کمیسیون ماده ۶۴)',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 2,
        'نوع کاربری اعیانی': 'تجاری',
        'تمام بتن/اسکلت بتنی/فلزی/سوله (ریال)': 28500000,
        'سایر سازه‌ها (ریال)': 17200000,
        توضیحات: 'ارزش هر مترمربع بنا بر مبنای ریال (مصوب کمیسیون ماده ۶۴)',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 3,
        'نوع کاربری اعیانی': 'صنعتی-کارگاهی، خدماتی، آموزشی، بهداشتی-درمانی، تفریحی-ورزشی، فرهنگی، هتلداری، گردشگری، حمل‌ونقل، انبار، پارکینگ عمومی (توقفگاه) و ...',
        'تمام بتن/اسکلت بتنی/فلزی/سوله (ریال)': 15400000,
        'سایر سازه‌ها (ریال)': 6300000,
        توضیحات: 'ارزش هر مترمربع بنا بر مبنای ریال (مصوب کمیسیون ماده ۶۴)',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 4,
        'نوع کاربری اعیانی': 'کشاورزی (دامداری، دامپروری، پرورش طیور و آبزیان، پرورش گل و گیاه و ...)',
        'تمام بتن/اسکلت بتنی/فلزی/سوله (ریال)': 6800000,
        'سایر سازه‌ها (ریال)': 3400000,
        توضیحات: 'ارزش هر مترمربع بنا بر مبنای ریال (مصوب کمیسیون ماده ۶۴)',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
    ];
    const ws3 = XLSX.utils.json_to_sheet(buildingData);
    ws3['!cols'] = [
      { wch: 6 }, // ردیف
      { wch: 55 }, // نوع کاربری اعیانی
      { wch: 30 }, // تمام بتن/اسکلت بتنی/فلزی/سوله (ریال)
      { wch: 20 }, // سایر سازه‌ها (ریال)
      { wch: 45 }, // توضیحات
      { wch: 10 }, // استان
      { wch: 12 }, // شهر
      { wch: 8 }, // سال
    ];
    (ws3 as any)['!views'] = [{ rightToLeft: true }];
    XLSX.utils.book_append_sheet(wb, ws3, 'ارزش اعیانی');

    // 4. Sheet: مراحل ساخت
    const stagesData = [
      {
        ردیف: 1,
        'مرحله ساخت': 'فونداسیون',
        'درصد از ارزش معاملاتی اعیانی': 10,
        'شرح پیشرفت فیزیکی': 'اجرای پی‌کنی، بتن مگر، آرماتوربندی و بتن‌ریزی فونداسیون (۱۰٪ ارزش اعیانی)',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 2,
        'مرحله ساخت': 'اسکلت',
        'درصد از ارزش معاملاتی اعیانی': 30,
        'شرح پیشرفت فیزیکی': 'اجرای ستون‌ها، تیرها، بادبندها یا دیوارهای برشی و سقف‌های طبقات (۳۰٪ ارزش اعیانی)',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 3,
        'مرحله ساخت': 'سفت‌کاری',
        'درصد از ارزش معاملاتی اعیانی': 50,
        'شرح پیشرفت فیزیکی': 'اجرای کامل تیغه‌چینی‌ها، دیوارهای پیرامونی، عایق‌کاری و خاک‌گچ (۵۰٪ ارزش اعیانی)',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        ردیف: 4,
        'مرحله ساخت': 'نازک‌کاری و تکمیل',
        'درصد از ارزش معاملاتی اعیانی': 100,
        'شرح پیشرفت فیزیکی': 'تکمیل کامل ساختمان شامل سفیدکاری، کاشی‌کاری، نماسازی، تاسیسات و پایان‌کار (۱۰۰٪ ارزش اعیانی)',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
    ];
    const ws4 = XLSX.utils.json_to_sheet(stagesData);
    ws4['!cols'] = [
      { wch: 6 }, // ردیف
      { wch: 22 }, // مرحله ساخت
      { wch: 26 }, // درصد از ارزش معاملاتی اعیانی
      { wch: 60 }, // شرح پیشرفت فیزیکی
      { wch: 10 }, // استان
      { wch: 12 }, // شهر
      { wch: 8 }, // سال
    ];
    (ws4 as any)['!views'] = [{ rightToLeft: true }];
    XLSX.utils.book_append_sheet(wb, ws4, 'مراحل ساخت');

    // 5. Sheet: ضوابط
    const rulesData = [
      {
        بند: 1,
        موضوع: 'بند ۱-۲: تشخیص نوع کاربری املاک بر اساس اسناد رسمی',
        ضابطه: 'کاربری املاک براساس نوع کاربری مندرج در سند رسمی و یا سایر اسناد مثبته مربوط می‌باشد.',
        'مستند قانونی': 'ماده ۶۴ ق.م.م - ضوابط اجرایی عرصه',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        بند: 2,
        موضوع: 'بند ۲-۲: کاربری نامشخص یا مختلط',
        ضابطه: 'در خصوص املاکی که کاربری آنها مشخص نمی‌باشد، براساس نوع کاربری اعیانی احداث شده در آنها و درخصوص اعیانی‌های با کاربری متفاوت (مختلط)، براساس قدرالسهم عرصه هریک از اعیانی‌های مستحدثه و نوع کاربری آنها تعیین می‌گردد.',
        'مستند قانونی': 'ماده ۶۴ ق.م.م - ضوابط اجرایی عرصه',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        بند: 3,
        موضوع: 'بند ۳-۲: عرصه فاقد کاربری و فاقد اعیانی',
        ضابطه: 'در خصوص عرصه املاک فاقد کاربری و فاقد اعیانی، طبق ردیف (۴) جدول (سایر کاربری‌ها با ضریب ۰.۲ نسبت به ارزش مسکونی) عمل خواهد شد.',
        'مستند قانونی': 'ماده ۶۴ ق.م.م - ضوابط اجرایی عرصه',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        بند: 4,
        موضوع: 'بند ۳: ارزش معاملاتی عرصه و تعدیل عرض معابر (مبنای ۲۴ متری)',
        ضابطه: 'ارزش‌های معاملاتی عرصه مندرج در جداول پیوست این مجموعه، مربوط به معابر با عرض ۲۴ متر می‌باشد و به ازای هر متر (یا ضریبی از متر) کسری نسبت به مبنای مذکور، حسب مورد ۳٪ (سه درصد) از ارزش‌های مزبور کسر می‌گردد. (سقف معابر ۲۴ متری و حداقل عرض مؤثر معابر ۸ متر معادل ۴۸٪ کسری و ضریب ۰.۵۲ می‌باشد).',
        'مستند قانونی': 'ماده ۶۴ ق.م.م - تعدیل معابر',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        بند: 5,
        موضوع: 'بند ۴: عرصه دارای دو بر یا بیشتر',
        ضابطه: 'در محاسبه ارزش عرصه‌هایی که دارای ۲ بر یا بیشتر می‌باشند، بالاترین ارزش معبر مربوطه ملاک عمل خواهد بود، مشروط بر این که از معبر مذکور راه عبور داشته باشد.',
        'مستند قانونی': 'ماده ۶۴ ق.م.م - ضوابط معابر چندبر',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        بند: 6,
        موضوع: 'بند ۵: املاک واقع در بر میادین',
        ضابطه: 'ارزش عرصه املاک واقع در بر میادین، معادل بالاترین ارزش معبری است که از آن میدان منشعب می‌شود.',
        'مستند قانونی': 'ماده ۶۴ ق.م.م - ضوابط میادین',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        بند: 7,
        موضوع: 'بند ۶: املاک فاقد راه عبور مستقل (حق عبور از مجاور)',
        ضابطه: 'ارزش عرصه املاکی که راه عبور مستقلی ندارند و حق عبور از ملک مجاور را دارند، برابر شصت درصد (۶۰٪) ارزش عرصه معبری است که راه عبور ملک از آن منشعب می‌شود.',
        'مستند قانونی': 'ماده ۶۴ ق.م.م - ضوابط حق عبور و ارتفاق',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        بند: 8,
        موضوع: 'بند ۷: املاک در بر بزرگراه، اتوبان، مسیل، حریم راه‌آهن و نهر',
        ضابطه: 'ارزش عرصه املاکی که در بر بزرگراه، اتوبان، مسیل، حریم راه‌آهن و نهر قرار دارند تا زمانی که شرایط استفاده و عبور و مرور از آنها، نظیر خیابان‌های داخلی شهر جهت دسترسی به ملک مورد نظر مهیا نباشد و رفت و آمد آنان از خیابان‌های دیگر صورت پذیرد، برابر خیابان مورد استفاده محاسبه می‌شود.',
        'مستند قانونی': 'ماده ۶۴ ق.م.م - ضوابط حریم و بزرگراه',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        بند: 9,
        موضوع: 'بند ۸: سراها، پاساژها و کاروانسراها',
        ضابطه: 'ارزش معاملاتی عرصه سراها، پاساژها و کاروانسراها بر اساس بالاترین ارزش معاملاتی معبری که از آن منشعب می‌شوند، محاسبه می‌شود.',
        'مستند قانونی': 'ماده ۶۴ ق.م.م - ضوابط پاساژها',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        بند: 10,
        موضوع: 'بند ۹: حریم قانونی شهر، بخش و روستا فاقد ارزش مصوب',
        ضابطه: 'چنانچه برای املاک واقع در حریم قانونی شهر، بخش و روستای مورد نظر ارزش معاملاتی تعیین نشده باشد، معادل هفتاد درصد (۷۰٪) ارزش معاملاتی نزدیک‌ترین محل مشابه، حسب مورد مبنای محاسبه خواهد بود.',
        'مستند قانونی': 'ماده ۶۴ ق.م.م - ضوابط حریم قانونی فاقد ارزش',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        بند: 11,
        موضوع: 'ساختمان مسکونی و اداری بیش از ۵ طبقه',
        ضابطه: 'از طبقه ششم به بالا، به ازای هر طبقه بالاتر، ۱/۵٪ به ارزش هر مترمربع موضوع ردیف ۲ (اعیانی مسکونی و اداری) اضافه می‌شود.',
        'مستند قانونی': 'ماده ۶۴ ق.م.م - ضوابط طبقات مسکونی/اداری',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        بند: 12,
        موضوع: 'ساختمان تجاری (تعدیل طبقات)',
        ضابطه: 'به ازای هر طبقه بالاتر یا پایین‌تر از همکف، ۱۰٪ و حداکثر ۳۰٪ از ارزش هر مترمربع ردیف تجاری کسر می‌شود.',
        'مستند قانونی': 'ماده ۶۴ ق.م.م - ضوابط طبقات تجاری',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        بند: 13,
        موضوع: 'پارکینگ و انباری اختصاصی',
        ضابطه: 'قیمت هر مترمربع ساختمان مربوط ۵۰٪ ارزش اعیانی مربوطه محاسبه می‌گردد.',
        'مستند قانونی': 'ماده ۶۴ ق.م.م - ضوابط پارکینگ و انباری',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        بند: 14,
        موضوع: 'قدمت ساختمان و استهلاک سالانه',
        ضابطه: 'به ازای هر سال قدمت، تا سقف ۲۰ سال، ۲٪ از کل ارزش اعیانی کسر می‌شود؛ حداکثر کسر استهلاک ۴۰٪ است.',
        'مستند قانونی': 'ماده ۶۴ ق.م.م - استهلاک اعیانی',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        بند: 15,
        موضوع: 'فضاهای غیرمسقف و مشاعات',
        ضابطه: 'فضاهای غیرمسقف، بالکن‌های روباز، حیاط، محوطه‌سازی و مشاعات عمومی در محاسبه ارزش اعیانی منظور نمی‌شوند.',
        'مستند قانونی': 'ماده ۶۴ ق.م.م - مشاعات و فضاهای روباز',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        بند: 16,
        موضوع: 'نوساز در بافت فرسوده',
        ضابطه: 'ساختمان مسکونی نوساز واقع در بافت فرسوده مصوب، در اولین نقل و انتقال قطعی و تا ۳ سال از تاریخ صدور پایان‌کار، معادل ۵۰٪ ارزش تعیین‌شده با رعایت ضوابط محاسبه می‌گردد.',
        'مستند قانونی': 'ماده ۶۴ ق.م.م - مشوق‌های بافت فرسوده',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
      {
        بند: 17,
        موضوع: 'پروژه‌های مسکونی حمایتی دولت (مسکن مهر / نهضت ملی)',
        ضابطه: 'در اولین نقل و انتقال قطعی پروژه‌های مسکونی حمایتی دولت، با معرفی وزارت راه و شهرسازی به صورت مکان‌محور، معادل ۵۰٪ ارزش تعیین‌شده محاسبه خواهد شد.',
        'مستند قانونی': 'ماده ۶۴ ق.م.م - طرح‌های حمایتی مسکن',
        استان: 'گیلان',
        شهر: 'خشکبیجار',
        سال: 1403,
      },
    ];
    const ws5 = XLSX.utils.json_to_sheet(rulesData);
    ws5['!cols'] = [
      { wch: 6 }, // بند
      { wch: 45 }, // موضوع
      { wch: 70 }, // ضابطه
      { wch: 30 }, // مستند قانونی
      { wch: 10 }, // استان
      { wch: 12 }, // شهر
      { wch: 8 }, // سال
    ];
    (ws5 as any)['!views'] = [{ rightToLeft: true }];
    XLSX.utils.book_append_sheet(wb, ws5, 'ضوابط');

    XLSX.writeFile(wb, 'اکسل_نمونه_درج_اطلاعات_ارزش_معاملاتی.xlsx');
  };

  // Handle Predict Rates
  const handlePredictNewYearRates = async () => {
    setIsPredicting(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/base-rates/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          targetYear: targetPredictYear,
          baseYear: basePredictYear,
          inflationRatePercent: inflationPercent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: 'success', text: data.message });
        onRefreshBaseRates();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'خطا در محاسبه پیش‌بینی' });
      }
    } catch (err) {
      console.error('Error in predict rates:', err);
    } finally {
      setIsPredicting(false);
    }
  };

  // Unique Blocks in Selected Province & City
  const existingBlocks = Array.from(
    new Set(
      baseRates
        .filter((r) => {
          const matchProv = selectedProvince === 'همه' || r.province === selectedProvince;
          const matchCity = selectedCityFilter === 'همه' || r.city === selectedCityFilter;
          return matchProv && matchCity && r.blockCode;
        })
        .map((r) => r.blockCode as string)
    )
  );

  // Filtered Base Rates
  const isAllProvince = !selectedProvince || selectedProvince === 'همه';
  const isAllCity = !selectedCityFilter || selectedCityFilter === 'همه';
  const isAllBlock = !selectedBlockFilter || selectedBlockFilter === 'همه';

  const filteredRates = baseRates.filter((r) => {
    const matchProv = isAllProvince || r.province === selectedProvince;
    const matchCity = isAllCity || r.city === selectedCityFilter;
    const matchBlock = isAllBlock || r.blockCode === selectedBlockFilter;
    const matchYear = r.year === selectedYear;
    const matchQuery =
      !searchQuery ||
      r.city.includes(searchQuery) ||
      r.province.includes(searchQuery) ||
      (r.blockCode && r.blockCode.includes(searchQuery)) ||
      (r.partCode && r.partCode.includes(searchQuery)) ||
      (r.sectionName && r.sectionName.includes(searchQuery)) ||
      (r.address && r.address.includes(searchQuery)) ||
      (r.notes && r.notes.includes(searchQuery));

    return matchProv && matchCity && matchBlock && matchYear && matchQuery;
  });

  return (
    <div className="space-y-6 animate-fadeIn dir-rtl">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 dark:bg-slate-900/60 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-black flex items-center justify-center font-bold shadow-lg shadow-amber-500/20 shrink-0">
            <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>پنل اختصاصی مدیریت اطلاعات پایه، بلوک‌ها و دسترسی‌ها</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/40">
                ADMIN ACCESS
              </span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              تنظیم ضرایب دفترچه املاک به تفکیک بلوک، قسمت‌ها، نشانی، ایمپورت اکسل و مدیریت کاربران.
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshBaseRates}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>بروزرسانی اطلاعات</span>
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-2 border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span className="font-bold">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-[#16161A] border border-slate-200 dark:border-white/10 overflow-x-auto">
        <button
          onClick={() => setActiveTab('rates')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'rates'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>بلوک‌ها و معابر</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 text-black font-mono">
            {baseRates.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('excel')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'excel'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>ایمپورت ۵ شیت اکسل و پیش‌بینی</span>
        </button>

        <button
          onClick={() => setActiveTab('usage_rates')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'usage_rates'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>ضرایب کاربری</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 text-black font-mono">
            {systemSettings.usage_rates?.length || 5}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('building_rates')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'building_rates'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>ارزش اعیانی</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 text-black font-mono">
            {systemSettings.building_rates?.length || 4}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('stages')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'stages'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>مراحل ساخت</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 text-black font-mono">
            {systemSettings.construction_stages?.length || 4}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'rules'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>ضوابط ماده ۶۴</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 text-black font-mono">
            {systemSettings.regulations?.length || 14}
          </span>
        </button>
      </div>

      {/* TAB 1: BASE RATES MANAGER */}
      {activeTab === 'rates' && (
        <div className="space-y-4">
          {/* Controls & Searchable Filters */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 items-end">
            {/* 1. Searchable Province Filter */}
            <SearchableSelect
              label="فیلتر استان"
              placeholder="همه استان‌ها"
              options={[
                { value: 'همه', label: 'همه استان‌ها' },
                ...existingProvinces.map((p) => ({ value: p, label: p })),
              ]}
              value={selectedProvince}
              onChange={(val) => {
                setSelectedProvince(val);
                setSelectedCityFilter('همه');
                setSelectedBlockFilter('همه');
              }}
            />

            {/* 2. Searchable City Filter */}
            <SearchableSelect
              label="فیلتر شهر / منطقه"
              placeholder="همه شهرها"
              options={[
                { value: 'همه', label: 'همه شهرها' },
                ...Array.from(
                  new Set(
                    baseRates
                      .filter((r) => isAllProvince || r.province === selectedProvince)
                      .map((r) => r.city)
                  )
                ).map((c) => ({ value: c, label: c })),
              ]}
              value={selectedCityFilter}
              onChange={(val) => {
                setSelectedCityFilter(val);
                setSelectedBlockFilter('همه');
              }}
            />

            {/* 3. Block Filter */}
            <SearchableSelect
              label="فیلتر کد بلوک"
              placeholder="همه بلوک‌ها"
              options={[
                { value: 'همه', label: 'همه بلوک‌ها' },
                ...existingBlocks.map((b) => ({ value: b, label: `بلوک ${b}` })),
              ]}
              value={selectedBlockFilter}
              onChange={(val) => setSelectedBlockFilter(val)}
            />

            {/* 4. Year Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                سال دفترچه ارزش
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value={1403}>سال ۱۴۰۳</option>
                <option value={1404}>سال ۱۴۰۴ (پیش‌بینی)</option>
                <option value={1405}>سال ۱۴۰۵</option>
              </select>
            </div>

            {/* 5. Search input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                جستجو در نشانی و بلوک
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بلوک، معبر، نشانی..."
                  className="w-full px-3 py-2.5 pr-8 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-3" />
              </div>
            </div>

            {/* 6. Add Rate Button */}
            <div>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>تعریف قسمت/بلوک جدید</span>
              </button>
            </div>
          </div>

          {/* Action Bar with Bulk Actions & Delete All */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                مجموع رکوردها: <span className="font-mono text-amber-600 dark:text-amber-400">{filteredRates.length}</span> مورد
              </span>

              {selectedRateIds.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold animate-fadeIn">
                  <CheckSquare className="w-4 h-4" />
                  <span>{selectedRateIds.length} مورد انتخاب شده</span>
                  <button
                    type="button"
                    onClick={() => setSelectedRateIds([])}
                    className="mr-1 text-[11px] underline hover:text-amber-500 cursor-pointer"
                  >
                    (لغو انتخاب)
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Delete Selected Button */}
              {selectedRateIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer animate-scaleUp"
                  title="حذف ردیف‌های انتخاب شده"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف انتخاب‌شده‌ها ({selectedRateIds.length})</span>
                </button>
              )}

              {/* Delete All Button */}
              <button
                type="button"
                onClick={() => {
                  setDeleteAllScope('filtered');
                  setDeleteAllStep(1);
                  setDeleteAllConfirmAccepted(false);
                  setIsDeleteAllModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                title="حذف همه رکوردهای فیلتر شده یا کلیه اطلاعات"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف همه...</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-[#16161A] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="p-3.5 text-center w-10">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectAll(filteredRates)}
                        className="flex items-center justify-center p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title={
                          filteredRates.length > 0 &&
                          filteredRates.every((r) => selectedRateIds.includes(r.id))
                            ? 'لغو انتخاب همه'
                            : 'انتخاب همه موارد فیلترشده'
                        }
                      >
                        {filteredRates.length > 0 &&
                        filteredRates.every((r) => selectedRateIds.includes(r.id)) ? (
                          <CheckSquare className="w-4 h-4 text-amber-500" />
                        ) : filteredRates.some((r) => selectedRateIds.includes(r.id)) ? (
                          <MinusSquare className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="p-3.5">استان و شهر</th>
                    <th className="p-3.5 text-center">کد بلوک</th>
                    <th className="p-3.5 text-center">قسمت</th>
                    <th className="p-3.5">نام معبر و شرح نشانی</th>
                    <th className="p-3.5">سال</th>
                    <th className="p-3.5 text-center">ضریب عرصه</th>
                    <th className="p-3.5">پایه عرصه P (ریال)</th>
                    <th className="p-3.5">پایه تجاری (ریال)</th>
                    <th className="p-3.5">سازه بتنی (ریال)</th>
                    <th className="p-3.5">سایر سازه‌ها (ریال)</th>
                    <th className="p-3.5 text-center">نقشه</th>
                    <th className="p-3.5 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-slate-800 dark:text-slate-200 font-medium">
                  {filteredRates.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="p-8 text-center text-slate-400 text-xs">
                        هیچ اطلاعات پایه‌ای برای فیلتر انتخابی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredRates.map((r) => {
                      const isSelected = selectedRateIds.includes(r.id);
                      return (
                        <tr
                          key={r.id}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-amber-500/10 dark:bg-amber-500/15'
                              : 'hover:bg-slate-50 dark:hover:bg-white/5'
                          }`}
                        >
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectRate(r.id)}
                              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-amber-500" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          </td>
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {r.province} - <span className="text-amber-600 dark:text-amber-400">{r.city}</span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold font-mono border border-amber-500/20">
                              {r.blockCode ? `بلوک ${r.blockCode}` : '-'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-bold font-mono">
                              {r.partCode ? `قسمت ${r.partCode}` : '-'}
                            </span>
                          </td>
                          <td className="p-3.5 max-w-[220px]">
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {r.sectionName || '-'}
                            </div>
                            {r.address && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {r.address}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 font-mono">{r.year}</td>
                          <td className="p-3.5 text-center font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                            {r.landCoeff || 1.0}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {formatNumberWithCommas(r.baseLandValue)}
                          </td>
                          <td className="p-3.5 font-mono whitespace-nowrap">
                            {formatNumberWithCommas(r.baseLandCommercialValue || r.baseLandValue)}
                          </td>
                          <td className="p-3.5 font-mono whitespace-nowrap">{formatNumberWithCommas(r.baseBuildingConcrete)}</td>
                          <td className="p-3.5 font-mono whitespace-nowrap">{formatNumberWithCommas(r.baseBuildingOther)}</td>
                          <td className="p-3.5 text-center">
                            {r.imageUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage(r.imageUrl || null)}
                                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition-colors"
                                title="مشاهده نقشه / تصویر"
                              >
                                <ImageIcon className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(r)}
                                className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition-colors"
                                title="ویرایش"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setRateToDelete(r)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors cursor-pointer"
                                title="حذف اطلاعات بلوک"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXCEL IMPORT (5 SHEETS) & PREDICTION */}
      {activeTab === 'excel' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 gap-3">
              <div className="flex items-center gap-3 text-slate-900 dark:text-white font-bold text-sm">
                <FileSpreadsheet className="w-6 h-6 text-emerald-500 shrink-0" />
                <div>
                  <div>ایمپورت هوشمند فایل اکسل ۵ شیت رسمی دفترچه ماده ۶۴</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                    شامل شیت‌های بلوک‌ها، ضرایب کاربری، ارزش اعیانی، مراحل ساخت و ضوابط قانونی
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownloadSampleTemplate}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors cursor-pointer shrink-0"
                title="دانلود فایل اکسل نمونه درج اطلاعات ارزش معاملاتی"
              >
                <Download className="w-4 h-4" />
                <span>دانلود اکسل نمونه درج اطلاعات ارزش معاملاتی</span>
              </button>
            </div>

            {/* Target Import Location Settings */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#16161A] border border-slate-200 dark:border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  استان مقصد ایمپورت
                </label>
                <input
                  type="text"
                  value={targetImportProvince}
                  onChange={(e) => setTargetImportProvince(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F0F12] text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  شهر / منطقه مقصد
                </label>
                <input
                  type="text"
                  value={targetImportCity}
                  onChange={(e) => setTargetImportCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F0F12] text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سال مصوب دفترچه
                </label>
                <input
                  type="number"
                  value={targetImportYear}
                  onChange={(e) => setTargetImportYear(parseInt(e.target.value, 10) || 1403)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F0F12] text-xs font-bold text-slate-800 dark:text-white font-mono focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* 5-Sheet Structure Overview Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#16161A] border border-slate-200 dark:border-white/5 space-y-2">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                ساختار استاندارد ۵ شیت شناسایی شونده توسط سیستم:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-bold">
                  ۱. بلوک‌ها
                  <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    معابر، قیمت عرصه و تجاری
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 font-bold">
                  ۲. ضرایب کاربری
                  <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    خدماتی، صنعتی، کشاورزی
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold">
                  ۳. ارزش اعیانی
                  <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    بتنی، فلزی، سایر سازه‌ها
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-400 font-bold">
                  ۴. مراحل ساخت
                  <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    فونداسیون تا تکمیل
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 font-bold">
                  ۵. ضوابط ماده ۶۴
                  <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    عرض معبر، طبقات، قدمت
                  </span>
                </div>
              </div>
            </div>

            {/* Dropzone */}
            <div className="border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-amber-500/60 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50 dark:bg-[#16161A] relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                کلیک کنید یا فایل اکسل را اینجا رها کنید (.xlsx / .csv)
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                سیستم به صورت هوشمند تمامی شیت‌های ۵ گانه موجود در فایل را استخراج و پردازش می‌نماید.
              </p>
            </div>

            {/* Detected Sheets Summary */}
            {detectedSheets.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-[#16161A] text-xs border border-slate-200 dark:border-white/10">
                <span className="font-bold text-slate-700 dark:text-slate-300">شیت‌های شناسایی‌شده در فایل:</span>
                {detectedSheets.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/10 text-slate-800 dark:text-white font-bold border border-slate-200 dark:border-white/10"
                  >
                    📄 {s}
                  </span>
                ))}
              </div>
            )}

            {/* Actions Bar: Cancel Button & Save All Sheets Button */}
            {(excelPreviewData.length > 0 ||
              excelUsageRates.length > 0 ||
              excelBuildingRates.length > 0 ||
              excelStages.length > 0 ||
              excelRules.length > 0) && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>فایل با موفقیت بازخوانی شد و آماده ثبت دائمی در پایگاه داده است</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    {importStatus}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center">
                  {/* Cancel Button */}
                  <button
                    type="button"
                    onClick={handleCancelUpload}
                    disabled={isImporting}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    <span>انصراف و لغو فایل</span>
                  </button>

                  {/* Confirm & Save All 5 Sheets Button */}
                  <button
                    type="button"
                    onClick={handleBulkImportToDB}
                    disabled={isImporting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>در حال ذخیره در پایگاه داده...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>تایید و ذخیره تمامی اطلاعات در دیتابیس</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Sub-Tabs for Previewing the Extracted Sheets */}
            {(excelPreviewData.length > 0 ||
              excelUsageRates.length > 0 ||
              excelBuildingRates.length > 0 ||
              excelStages.length > 0 ||
              excelRules.length > 0) && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActivePreviewSubTab('blocks')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      activePreviewSubTab === 'blocks'
                        ? 'bg-amber-500 text-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>بلوک‌ها و معابر</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15 font-mono">
                      {excelPreviewData.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePreviewSubTab('usage')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      activePreviewSubTab === 'usage'
                        ? 'bg-amber-500 text-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>ضرایب کاربری</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15 font-mono">
                      {excelUsageRates.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePreviewSubTab('building')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      activePreviewSubTab === 'building'
                        ? 'bg-amber-500 text-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>ارزش اعیانی</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15 font-mono">
                      {excelBuildingRates.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePreviewSubTab('stages')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      activePreviewSubTab === 'stages'
                        ? 'bg-amber-500 text-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>مراحل ساخت</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15 font-mono">
                      {excelStages.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePreviewSubTab('rules')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      activePreviewSubTab === 'rules'
                        ? 'bg-amber-500 text-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>ضوابط ماده ۶۴</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15 font-mono">
                      {excelRules.length}
                    </span>
                  </button>
                </div>

                {/* SubTab 1: Blocks Preview */}
                {activePreviewSubTab === 'blocks' && (
                  <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                    <table className="w-full text-right">
                      <thead className="bg-slate-100 dark:bg-[#16161A] text-slate-700 dark:text-slate-300 font-bold sticky top-0">
                        <tr>
                          <th className="p-2.5 text-center">بلوک</th>
                          <th className="p-2.5 text-center">قسمت</th>
                          <th className="p-2.5">محدوده / معبر</th>
                          <th className="p-2.5 text-center">ضریب عرصه</th>
                          <th className="p-2.5 text-center">مسکونی P (ریال)</th>
                          <th className="p-2.5 text-center">تجاری (ریال)</th>
                          <th className="p-2.5 text-center">سازه بتنی (ریال)</th>
                          <th className="p-2.5 text-center">سایر سازه‌ها (ریال)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-medium">
                        {excelPreviewData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5">
                            <td className="p-2.5 text-center font-mono font-bold text-amber-500">
                              {row.blockCode || idx + 1}
                            </td>
                            <td className="p-2.5 text-center font-mono text-slate-500">
                              {row.partCode || '1'}
                            </td>
                            <td className="p-2.5 truncate max-w-[200px]" title={row.sectionName}>
                              {row.sectionName || '-'}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                              {row.landCoeff || 1.0}
                            </td>
                            <td className="p-2.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              {formatNumberWithCommas(row.baseLandValue)}
                            </td>
                            <td className="p-2.5 text-center font-mono text-blue-600 dark:text-blue-400">
                              {formatNumberWithCommas(row.baseLandCommercialValue || 0)}
                            </td>
                            <td className="p-2.5 text-center font-mono text-slate-600 dark:text-slate-300">
                              {formatNumberWithCommas(row.baseBuildingConcrete || 0)}
                            </td>
                            <td className="p-2.5 text-center font-mono text-slate-600 dark:text-slate-300">
                              {formatNumberWithCommas(row.baseBuildingOther || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* SubTab 2: Usage Rates Preview */}
                {activePreviewSubTab === 'usage' && (
                  <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                    <table className="w-full text-right">
                      <thead className="bg-slate-100 dark:bg-[#16161A] text-slate-700 dark:text-slate-300 font-bold sticky top-0">
                        <tr>
                          <th className="p-2.5">ردیف</th>
                          <th className="p-2.5">نوع کاربری</th>
                          <th className="p-2.5 text-center">ضریب تعدیل نسبت به ارزش مسکونی</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-medium">
                        {excelUsageRates.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5">
                            <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{row.usage}</td>
                            <td className="p-2.5 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                              {row.coefficient}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* SubTab 3: Building Rates Preview */}
                {activePreviewSubTab === 'building' && (
                  <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                    <table className="w-full text-right">
                      <thead className="bg-slate-100 dark:bg-[#16161A] text-slate-700 dark:text-slate-300 font-bold sticky top-0">
                        <tr>
                          <th className="p-2.5">ردیف</th>
                          <th className="p-2.5">نوع کاربری اعیانی</th>
                          <th className="p-2.5 text-center">تمام بتن / اسکلت بتنی / فلزی / سوله (ریال)</th>
                          <th className="p-2.5 text-center">سایر سازه‌ها (ریال)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-medium">
                        {excelBuildingRates.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5">
                            <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{row.usage}</td>
                            <td className="p-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatNumberWithCommas(row.concrete)}
                            </td>
                            <td className="p-2.5 text-center font-mono text-blue-600 dark:text-blue-400">
                              {formatNumberWithCommas(row.other)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* SubTab 4: Stages Preview */}
                {activePreviewSubTab === 'stages' && (
                  <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                    <table className="w-full text-right">
                      <thead className="bg-slate-100 dark:bg-[#16161A] text-slate-700 dark:text-slate-300 font-bold sticky top-0">
                        <tr>
                          <th className="p-2.5">ردیف</th>
                          <th className="p-2.5">مرحله ساخت</th>
                          <th className="p-2.5 text-center">درصد از ارزش معاملاتی اعیانی</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-medium">
                        {excelStages.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5">
                            <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{row.stage}</td>
                            <td className="p-2.5 text-center font-mono font-bold text-purple-600 dark:text-purple-400">
                              %{row.percentage}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* SubTab 5: Rules Preview */}
                {activePreviewSubTab === 'rules' && (
                  <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                    <table className="w-full text-right">
                      <thead className="bg-slate-100 dark:bg-[#16161A] text-slate-700 dark:text-slate-300 font-bold sticky top-0">
                        <tr>
                          <th className="p-2.5 text-center">بند</th>
                          <th className="p-2.5">موضوع ضابطه</th>
                          <th className="p-2.5">متن ضابطه</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-medium">
                        {excelRules.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5">
                            <td className="p-2.5 text-center font-mono font-bold text-rose-500">
                              {row.id || idx + 1}
                            </td>
                            <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {row.title}
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-400 leading-relaxed">
                              {row.rule}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Inflation AI Predictor Box */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-xl space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold text-sm">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              <span>محاسبه و پیش‌بینی هوشمند ضرایب سال جدید بر اساس تورم</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              با استفاده از این ابزار می‌توانید کلیه نرخ‌های بلوک‌ها و قسمت‌های مصوب سال جاری را با اعمال درصد رشد تورمی مشخص، به صورت اتوماتیک برای سال جدید (مثلاً ۱۴۰۴) محاسبه و ذخیره نمایید.
            </p>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    سال مبنا (منبع)
                  </label>
                  <select
                    value={basePredictYear}
                    onChange={(e) => setBasePredictYear(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs font-bold text-slate-800 dark:text-white"
                  >
                    <option value={1403}>۱۴۰۳</option>
                    <option value={1404}>۱۴۰۴</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    سال هدف (پیش‌بینی)
                  </label>
                  <select
                    value={targetPredictYear}
                    onChange={(e) => setTargetPredictYear(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-xs font-bold text-slate-800 dark:text-white"
                  >
                    <option value={1404}>۱۴۰۴</option>
                    <option value={1405}>۱۴۰۵</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    درصد رشد تورم و تعدیل سالانه
                  </label>
                  <span className="text-xs font-bold text-amber-500 font-mono">%{inflationPercent}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="1"
                  value={inflationPercent}
                  onChange={(e) => setInflationPercent(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs">
                به عنوان مثال: تمامی قیمت‌های پایه بلوک‌ها و قسمت‌های سال {basePredictYear} با رشد %{inflationPercent}+ ضرب گردیده و نسخه پیش‌بینی سال {targetPredictYear} برای تمامی شهرهای ثبت شده در دیتابیس ایجاد می‌شود.
              </div>

              <button
                onClick={handlePredictNewYearRates}
                disabled={isPredicting}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/10 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isPredicting ? 'در حال محاسبه و پیش‌بینی...' : `محاسبه و تولید ضرایب سال ${targetPredictYear}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: USAGE RATES MANAGEMENT */}
      {activeTab === 'usage_rates' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 gap-3">
              <div className="flex items-center gap-3 text-slate-900 dark:text-white font-bold text-sm">
                <Percent className="w-5 h-5 text-amber-500" />
                <span>ضرایب تعدیل انواع کاربری نسبت به ارزش مسکونی (شیت ۲ دفترچه)</span>
              </div>
              <button
                onClick={() =>
                  handleSaveSystemSetting('usage_rates', systemSettings.usage_rates)
                }
                disabled={isSavingSetting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingSetting ? 'در حال ذخیره...' : 'ذخیره ضرایب در دیتابیس'}</span>
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-[#16161A] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="p-3">ردیف</th>
                    <th className="p-3">نوع کاربری</th>
                    <th className="p-3 text-center">ضریب تعدیل نسبت به مسکونی</th>
                    <th className="p-3">توضیحات و مصوبات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-medium text-slate-800 dark:text-slate-200">
                  {systemSettings.usage_rates.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold">{item.usage}</td>
                      <td className="p-3 text-center font-mono">
                        <input
                          type="number"
                          step="0.05"
                          value={item.coefficient}
                          onChange={(e) => {
                            const newArr = [...systemSettings.usage_rates];
                            newArr[idx].coefficient = parseFloat(e.target.value) || 0;
                            setSystemSettings({ ...systemSettings, usage_rates: newArr });
                          }}
                          className="w-24 px-2.5 py-1 text-center font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-amber-600 dark:text-amber-400 font-mono"
                        />
                      </td>
                      <td className="p-3 text-slate-500 text-[11px]">{item.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: BUILDING RATES MANAGEMENT */}
      {activeTab === 'building_rates' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 gap-3">
              <div className="flex items-center gap-3 text-slate-900 dark:text-white font-bold text-sm">
                <Building className="w-5 h-5 text-emerald-500" />
                <span>ارزش معاملاتی اعیانی بر اساس نوع سازه و کاربری (شیت ۳ دفترچه)</span>
              </div>
              <button
                onClick={() =>
                  handleSaveSystemSetting('building_rates', systemSettings.building_rates)
                }
                disabled={isSavingSetting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingSetting ? 'در حال ذخیره...' : 'ذخیره ارزش اعیانی در دیتابیس'}</span>
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-[#16161A] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="p-3">ردیف</th>
                    <th className="p-3">نوع کاربری اعیانی</th>
                    <th className="p-3 text-center">اسکلت بتنی / فلزی / سوله (ریال)</th>
                    <th className="p-3 text-center">سایر سازه‌ها (ریال)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-medium text-slate-800 dark:text-slate-200">
                  {systemSettings.building_rates.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold">{item.usage}</td>
                      <td className="p-3 text-center font-mono">
                        <input
                          type="number"
                          value={item.concrete}
                          onChange={(e) => {
                            const newArr = [...systemSettings.building_rates];
                            newArr[idx].concrete = parseInt(e.target.value, 10) || 0;
                            setSystemSettings({ ...systemSettings, building_rates: newArr });
                          }}
                          className="w-36 px-2.5 py-1 text-center font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-emerald-600 dark:text-emerald-400 font-mono"
                        />
                      </td>
                      <td className="p-3 text-center font-mono">
                        <input
                          type="number"
                          value={item.other}
                          onChange={(e) => {
                            const newArr = [...systemSettings.building_rates];
                            newArr[idx].other = parseInt(e.target.value, 10) || 0;
                            setSystemSettings({ ...systemSettings, building_rates: newArr });
                          }}
                          className="w-36 px-2.5 py-1 text-center font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-blue-600 dark:text-blue-400 font-mono"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CONSTRUCTION STAGES MANAGEMENT */}
      {activeTab === 'stages' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 gap-3">
              <div className="flex items-center gap-3 text-slate-900 dark:text-white font-bold text-sm">
                <Layers className="w-5 h-5 text-purple-500" />
                <span>درصد ارزش معاملاتی اعیانی در مراحل ساخت (شیت ۴ دفترچه)</span>
              </div>
              <button
                onClick={() =>
                  handleSaveSystemSetting('construction_stages', systemSettings.construction_stages)
                }
                disabled={isSavingSetting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingSetting ? 'در حال ذخیره...' : 'ذخیره مراحل در دیتابیس'}</span>
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-[#16161A] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="p-3">ردیف</th>
                    <th className="p-3">مرحله ساخت</th>
                    <th className="p-3 text-center">درصد از ارزش معاملاتی اعیانی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-medium text-slate-800 dark:text-slate-200">
                  {systemSettings.construction_stages.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold">{item.stage}</td>
                      <td className="p-3 text-center font-mono">
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.percentage}
                            onChange={(e) => {
                              const newArr = [...systemSettings.construction_stages];
                              newArr[idx].percentage = parseInt(e.target.value, 10) || 0;
                              setSystemSettings({ ...systemSettings, construction_stages: newArr });
                            }}
                            className="w-20 px-2 py-1 text-center font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-purple-600 dark:text-purple-400 font-mono"
                          />
                          <span className="text-slate-400 font-bold">%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: REGULATIONS MANAGEMENT */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-white/10 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 gap-3">
              <div className="flex items-center gap-3 text-slate-900 dark:text-white font-bold text-sm">
                <BookOpen className="w-5 h-5 text-rose-500" />
                <span>ضوابط و مقررات قانونی ارزش معاملاتی املاک ماده ۶۴ (شیت ۵ دفترچه)</span>
              </div>
              <button
                onClick={() =>
                  handleSaveSystemSetting('regulations', systemSettings.regulations)
                }
                disabled={isSavingSetting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingSetting ? 'در حال ذخیره...' : 'ذخیره ضوابط در دیتابیس'}</span>
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-[#16161A] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="p-3 text-center">بند</th>
                    <th className="p-3">موضوع ضابطه</th>
                    <th className="p-3">شرح کامل ضابطه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-medium text-slate-800 dark:text-slate-200">
                  {systemSettings.regulations.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="p-3 text-center font-mono font-bold text-rose-500">
                        {item.id || idx + 1}
                      </td>
                      <td className="p-3 font-bold whitespace-nowrap">{item.title}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 leading-relaxed">
                        {item.rule}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EDIT / ADD RATE MODAL */}
      {isModalOpen && editingRate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl p-6 bg-white dark:bg-[#0F0F12] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white space-y-4 max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-500" />
                <span>{editingRate.id ? 'ویرایش اطلاعات بلوک و قسمت' : 'تعریف بلوک و قسمت جدید'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message Display INSIDE the form modal */}
            {modalError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{modalError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalError(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Province Searchable Dropdown */}
              <div>
                <SearchableSelect
                  label="استان"
                  placeholder="-- انتخاب یا تایپ نام استان --"
                  options={existingProvinces.map((p) => ({ value: p, label: p }))}
                  value={editingRate.province || ''}
                  onChange={(val) => {
                    setModalError(null);
                    setEditingRate({ ...editingRate, province: val });
                  }}
                  allowCustom={true}
                  customPlaceholder="نام استان جدید..."
                />
              </div>

              {/* City Searchable Dropdown */}
              <div>
                <SearchableSelect
                  label="شهر / منطقه"
                  placeholder="-- انتخاب یا تایپ نام شهر --"
                  options={Array.from(
                    new Set(
                      baseRates
                        .filter((r) => !editingRate.province || r.province === editingRate.province)
                        .map((r) => r.city)
                    )
                  ).map((c) => ({ value: c, label: c }))}
                  value={editingRate.city || ''}
                  onChange={(val) => {
                    setModalError(null);
                    setEditingRate({ ...editingRate, city: val });
                  }}
                  allowCustom={true}
                  customPlaceholder="نام شهر/منطقه جدید..."
                />
              </div>

              {/* Block Code */}
              <div>
                <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                  کد بلوک (شماره بلوک دارایی)
                </label>
                <input
                  type="text"
                  value={editingRate.blockCode || ''}
                  onChange={(e) => setEditingRate({ ...editingRate, blockCode: e.target.value })}
                  placeholder="مثلا: ۱۲ یا ۱۰۵"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              {/* Part Code */}
              <div>
                <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                  کد قسمت / ردیف در بلوک
                </label>
                <input
                  type="text"
                  value={editingRate.partCode || ''}
                  onChange={(e) => setEditingRate({ ...editingRate, partCode: e.target.value })}
                  placeholder="مثلا: ۱ یا ۲ یا ۳"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              {/* Section / Street Name */}
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                  نام معبر، خیابان و محدوده
                </label>
                <input
                  type="text"
                  value={editingRate.sectionName || ''}
                  onChange={(e) => setEditingRate({ ...editingRate, sectionName: e.target.value })}
                  placeholder="مثلا: خیابان مطهری (میدان صیقلان تا چهارراه میکائیل)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-slate-900 dark:text-white font-bold"
                />
              </div>

              {/* Address detail */}
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                  شرح نشانی و موقعیت مکانی دقیق
                </label>
                <input
                  type="text"
                  value={editingRate.address || ''}
                  onChange={(e) => setEditingRate({ ...editingRate, address: e.target.value })}
                  placeholder="مثلا: بر اصلی خیابان مطهری، کوچه‌های منشعب با عرض ۸ متر..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300">سال دفترچه ارزش</label>
                <input
                  type="number"
                  value={editingRate.year || 1403}
                  onChange={(e) => setEditingRate({ ...editingRate, year: parseInt(e.target.value, 10) || 1403 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                  ضریب عرصه P (ضریب شهرستان)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={editingRate.landCoeff ?? 1.0}
                  onChange={(e) => setEditingRate({ ...editingRate, landCoeff: parseFloat(e.target.value) || 1.0 })}
                  placeholder="1.0"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              {/* Numeric Price Fields with Thousands Separators */}
              <FormattedNumberInput
                label="قیمت پایه عرصه P (ریال/متر)"
                value={editingRate.baseLandValue}
                onChange={(val) => setEditingRate({ ...editingRate, baseLandValue: val })}
                placeholder="مثلا: ۴۶۰,۰۰۰,۰۰۰"
                unit="ریال"
              />

              <FormattedNumberInput
                label="قیمت پایه زمین تجاری (ریال/متر)"
                value={editingRate.baseLandCommercialValue}
                onChange={(val) => setEditingRate({ ...editingRate, baseLandCommercialValue: val })}
                placeholder="مثلا: ۸۲۰,۰۰۰,۰۰۰"
                unit="ریال"
              />

              <FormattedNumberInput
                label="پایه سازه بتونی/فلزی (ریال/متر)"
                value={editingRate.baseBuildingConcrete}
                onChange={(val) => setEditingRate({ ...editingRate, baseBuildingConcrete: val })}
                placeholder="مثلا: ۲۶,۰۰۰,۰۰۰"
                unit="ریال"
              />

              <div className="sm:col-span-2">
                <FormattedNumberInput
                  label="پایه سایر سازه‌ها - آجری/چوبی (ریال/متر)"
                  value={editingRate.baseBuildingOther}
                  onChange={(val) => setEditingRate({ ...editingRate, baseBuildingOther: val })}
                  placeholder="مثلا: ۸,۵۰۰,۰۰۰"
                  unit="ریال"
                />
              </div>

              {/* Image Upload for Block Map */}
              <div className="sm:col-span-2">
                <ImageAttachmentUploader
                  label="پیوست تصویر نقشه کاداستر یا کروکی بلوک"
                  description="تصویر نقشه بلوک یا کروکی معبر را بارگذاری کنید (فشرده‌سازی خودکار)"
                  value={editingRate.imageUrl}
                  onChange={(url) => setEditingRate({ ...editingRate, imageUrl: url })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300">توضیحات تکمیلی</label>
                <textarea
                  value={editingRate.notes || ''}
                  onChange={(e) => setEditingRate({ ...editingRate, notes: e.target.value })}
                  placeholder="مثلا: مصوب کمیسیون تقویم املاک استان..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16161A] text-slate-900 dark:text-white h-16 text-xs focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveRate}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>ذخیره اطلاعات بلوک</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Rate In-App Confirmation Modal */}
      {rateToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#121216] rounded-2xl border border-rose-500/30 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  تایید حذف اطلاعات پایه و معبر
                </h3>
                <span className="text-[11px] text-rose-500 font-bold">غیرقابل بازگشت</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              آیا از حذف دائم اطلاعات پایه «
              <strong className="text-slate-900 dark:text-white">
                {rateToDelete.province} - {rateToDelete.city} | بلوک {rateToDelete.blockCode || '-'}{' '}
                {rateToDelete.partCode ? `(قسمت ${rateToDelete.partCode})` : ''}
              </strong>
              »
              {rateToDelete.sectionName ? ` - ${rateToDelete.sectionName}` : ''} اطمینان دارید؟
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setRateToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={confirmDeleteRate}
                disabled={isDeletingRate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingRate ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>بله، حذف کن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Selected Rates Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#121216] rounded-2xl border border-rose-500/30 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  تایید حذف گروهی موارد انتخاب شده
                </h3>
                <span className="text-[11px] text-rose-500 font-bold">
                  {selectedRateIds.length} ردیف انتخاب شده
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium">
                شما در حال حذف دائم{' '}
                <strong className="font-black text-rose-800 dark:text-rose-200">
                  {selectedRateIds.length} رکورد
                </strong>{' '}
                از جدول بلوک‌ها و معابر هستید. این داده‌ها از پایگاه‌داده حذف شده و قابل بازیابی نخواهند بود.
              </p>
            </div>

            {/* List Preview of Selected Items */}
            <div className="max-h-36 overflow-y-auto p-2.5 rounded-xl bg-slate-50 dark:bg-[#16161A] border border-slate-200 dark:border-white/5 space-y-1.5 text-[11px]">
              {baseRates
                .filter((r) => selectedRateIds.includes(r.id))
                .slice(0, 5)
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between text-slate-700 dark:text-slate-300 py-1 px-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 font-medium"
                  >
                    <span>
                      {r.city} - بلوک {r.blockCode || '-'} {r.partCode ? `(قسمت ${r.partCode})` : ''}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">سال {r.year}</span>
                  </div>
                ))}
              {selectedRateIds.length > 5 && (
                <div className="text-center text-[10px] text-slate-400 pt-1">
                  ... و {selectedRateIds.length - 5} رکورد دیگر
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={confirmBulkDeleteRates}
                disabled={isPerformingBatchDelete}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isPerformingBatchDelete ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>بله، موارد انتخابی را حذف کن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Two-Step Confirmation Modal (Filtered or Entire Table) */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#121216] rounded-2xl border border-rose-500/30 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            {/* Header with Step Indicator */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3 text-rose-500">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {deleteAllStep === 1 ? 'حذف دسته‌جمعی یا کلی اطلاعات پایه' : 'تایید نهایی و امنیتی حذف داده‌ها'}
                  </h3>
                  <span className="text-[11px] text-rose-500 font-bold">
                    {deleteAllStep === 1 ? 'مرحله ۱ از ۲: انتخاب محدوده' : 'مرحله ۲ از ۲: تایید قطعی حذف'}
                  </span>
                </div>
              </div>

              {/* Progress Steps Dots */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    deleteAllStep === 1 ? 'bg-amber-500 scale-110' : 'bg-slate-300 dark:bg-white/20'
                  }`}
                />
                <span
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    deleteAllStep === 2 ? 'bg-rose-500 scale-110' : 'bg-slate-300 dark:bg-white/20'
                  }`}
                />
              </div>
            </div>

            {/* STEP 1: Select Scope */}
            {deleteAllStep === 1 && (
              <>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  لطفاً مشخص فرمایید مایل به حذف کدام دسته از اطلاعات بلوک‌ها و معابر هستید:
                </p>

                {/* Scope Selection Radio Cards */}
                <div className="space-y-2.5">
                  <label
                    onClick={() => setDeleteAllScope('filtered')}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      deleteAllScope === 'filtered'
                        ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 text-slate-900 dark:text-white shadow-sm'
                        : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deleteScope"
                      checked={deleteAllScope === 'filtered'}
                      onChange={() => setDeleteAllScope('filtered')}
                      className="mt-1 accent-amber-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold">
                        حذف موارد فیلتر شده فعلی ({filteredRates.length} رکورد)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        استان: <span className="text-amber-600 dark:text-amber-400 font-bold">{selectedProvince}</span> | شهر:{' '}
                        <span className="text-amber-600 dark:text-amber-400 font-bold">{selectedCityFilter}</span> | سال:{' '}
                        <span className="font-mono font-bold">{selectedYear}</span>
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setDeleteAllScope('all')}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      deleteAllScope === 'all'
                        ? 'border-rose-500 bg-rose-500/10 dark:bg-rose-500/15 text-slate-900 dark:text-white shadow-sm'
                        : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deleteScope"
                      checked={deleteAllScope === 'all'}
                      onChange={() => setDeleteAllScope('all')}
                      className="mt-1 accent-rose-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        حذف کامل کلیه اطلاعات پایه‌ای سامانه ({baseRates.length} رکورد)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        شامل کلیه شهرها، استان‌ها و سال‌های ثبت شده در کل سیستم
                      </div>
                    </div>
                  </label>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>در مرحله بعد، جزئیات و تاییدیه امنیتی قبل از حذف قطعی اخذ خواهد شد.</span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsDeleteAllModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    انصراف
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteAllConfirmAccepted(false);
                      setDeleteAllStep(2);
                    }}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20 transition-all cursor-pointer"
                  >
                    <span>ادامه به مرحله دوم (تایید نهایی)</span>
                    <span className="font-mono text-sm">←</span>
                  </button>
                </div>
              </>
            )}

            {/* STEP 2: Final Security Confirmation */}
            {deleteAllStep === 2 && (
              <>
                <div className="p-4 rounded-xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs space-y-2.5">
                  <div className="flex items-center gap-2 font-black text-rose-600 dark:text-rose-400 text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse text-rose-500" />
                    <span>اخطار شدید: این عملیات غیرقابل بازگشت است!</span>
                  </div>

                  <p className="leading-relaxed font-medium">
                    شما در حال حذف دائم و کامل{' '}
                    <strong className="text-rose-950 dark:text-white font-black text-sm">
                      {deleteAllScope === 'all' ? baseRates.length : filteredRates.length} رکورد
                    </strong>{' '}
                    از پایگاه‌داده اطلاعات پایه سامانه هستید.
                  </p>

                  <div className="pt-2 border-t border-rose-500/20 text-[11px] space-y-1 font-medium">
                    <div>
                      <span className="text-slate-600 dark:text-slate-300">محدوده تعیین‌شده: </span>
                      <strong className="text-slate-900 dark:text-white">
                        {deleteAllScope === 'all'
                          ? 'کل اطلاعات پایه‌ای سراسر سیستم (تمامی شهرها)'
                          : `فیلتر جاری (استان ${selectedProvince} - شهر ${selectedCityFilter} - سال ${selectedYear})`}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Explicit Checkbox Confirmation */}
                <label className="p-3 rounded-xl bg-slate-50 dark:bg-[#16161A] border border-slate-200 dark:border-white/10 flex items-start gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={deleteAllConfirmAccepted}
                    onChange={(e) => setDeleteAllConfirmAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-rose-600 rounded cursor-pointer"
                  />
                  <span className="text-xs text-slate-800 dark:text-slate-200 font-bold leading-relaxed select-none">
                    از عواقب پاکسازی دائمی داده‌ها کاملاً آگاهم و حذف قطعی این{' '}
                    <span className="text-rose-600 dark:text-rose-400 font-black">
                      {deleteAllScope === 'all' ? baseRates.length : filteredRates.length} رکورد
                    </span>{' '}
                    را تایید می‌نمایم.
                  </span>
                </label>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setDeleteAllStep(1)}
                    disabled={isPerformingBatchDelete}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <span>→</span>
                    <span>بازگشت به مرحله ۱</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDeleteAllModalOpen(false)}
                      disabled={isPerformingBatchDelete}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      انصراف
                    </button>

                    <button
                      type="button"
                      onClick={confirmDeleteAllRates}
                      disabled={!deleteAllConfirmAccepted || isPerformingBatchDelete}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isPerformingBatchDelete ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      <span>تایید نهایی و پاکسازی داده‌ها</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Global Image Preview Zoom Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-black rounded-2xl overflow-hidden border border-white/20 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="نقشه بلوک"
              className="max-h-[85vh] max-w-full object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
