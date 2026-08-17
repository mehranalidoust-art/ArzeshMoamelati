import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { CalculationBreakdown, CalculationFormData, SavedCalculationItem } from '../types.ts';
import { calculateRegionalValue, formatCurrencyInPersianWords, formatNumberWithCommas, toPersianDigits } from './calculator.ts';

/**
 * Generate comprehensive official PDF report including step-by-step
 * calculation logic, Article 64 tax law formulas, multi-part block info,
 * address details, and attached images/maps.
 */
export async function generatePropertyPdfReport(
  inputData: CalculationFormData | SavedCalculationItem,
  customBreakdown?: CalculationBreakdown
): Promise<void> {
  let formData: CalculationFormData;
  let breakdown: CalculationBreakdown;

  if ('createdAt' in inputData || ('id' in inputData && !('landUsage' in inputData && typeof inputData.landUsage === 'string' && inputData.landUsage.includes('_') === false && false))) {
    const item = inputData as SavedCalculationItem;
    formData = {
      title: item.title || 'محاسبه ارزش ملک',
      province: item.province || 'گیلان',
      city: item.city || 'رشت',
      blockCode: item.blockCode || '',
      partCode: item.partCode || '',
      sectionName: item.sectionName || '',
      address: item.address || '',
      landArea: item.landArea || 0,
      baseLandValue: item.baseLandValue || 0,
      landUsage: (item.landUsage as any) || 'residential_commercial_admin',
      streetWidth: item.streetWidth || 24,
      landSpecialCondition: (item.landSpecialCondition as any) || 'none',
      hasBuilding: !!item.hasBuilding,
      buildingArea: item.buildingArea || 0,
      structureType: (item.structureType as any) || 'concrete_steel',
      buildingUsage: (item.buildingUsage as any) || 'residential_admin',
      floorNumber: item.floorNumber || 0,
      isCommercialAboveOrBelowGround: false,
      buildingAge: item.buildingAge || 0,
      completionStage: (item.completionStage as any) || 'completed',
      isDistressedArea: !!item.isDistressed,
      isGovernmentHousing: !!item.isGovernmentHousing,
      notes: item.notes || '',
      imageUrl: item.imageUrl || '',
    };
    breakdown = customBreakdown || calculateRegionalValue(formData);
  } else {
    formData = inputData as CalculationFormData;
    breakdown = customBreakdown || calculateRegionalValue(formData);
  }

  // Create temporary container for rendering the report
  const container = document.createElement('div');
  container.id = 'official-pdf-report-container';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = "'Vazirmatn', 'Vazir', Tahoma, Arial, sans-serif";
  container.style.direction = 'rtl';
  container.style.padding = '20px';
  container.style.boxSizing = 'border-box';

  const todayDateStr = new Date().toLocaleDateString('fa-IR');
  const reportId = 'VAL-' + toPersianDigits(Math.floor(100000 + Math.random() * 900000));

  const landEffectiveFormula = `${formatNumberWithCommas(breakdown.land.basePrice)} × ${toPersianDigits(breakdown.land.usageCoeff)} × ${toPersianDigits(breakdown.land.streetWidthCoeff)} × ${toPersianDigits(breakdown.land.specialConditionCoeff)} = ${formatNumberWithCommas(breakdown.land.effectiveLandPricePerM2)} ریال`;
  const landTotalFormula = `${formatNumberWithCommas(breakdown.land.effectiveLandPricePerM2)} ریال × ${toPersianDigits(formData.landArea)} مترمربع = ${formatNumberWithCommas(breakdown.land.totalLandValue)} ریال`;

  const buildingEffectiveFormula = breakdown.building.hasBuilding
    ? `${formatNumberWithCommas(breakdown.building.basePrice)} × ${toPersianDigits(breakdown.building.floorCoeff)} × ${toPersianDigits(breakdown.building.ageDiscountCoeff)} × ${toPersianDigits(breakdown.building.completionCoeff)}${formData.isDistressedArea ? ' × ۰.۵ (بافت فرسوده)' : ''} = ${formatNumberWithCommas(breakdown.building.effectiveBuildingPricePerM2)} ریال`
    : '۰ ریال';

  const buildingTotalFormula = breakdown.building.hasBuilding
    ? `${formatNumberWithCommas(breakdown.building.effectiveBuildingPricePerM2)} ریال × ${toPersianDigits(formData.buildingArea)} مترمربع = ${formatNumberWithCommas(breakdown.building.totalBuildingValue)} ریال`
    : '۰ ریال';

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; padding: 18px; border-radius: 8px; background: #ffffff; font-family: 'Vazirmatn', 'Vazir', Tahoma, Arial, sans-serif; direction: rtl; text-align: right;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 12px; margin-bottom: 14px;">
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 16px; font-weight: bold; color: #0f172a;">سامانه رسمی برآورد ارزش معاملاتی املاک (ماده ۶۴)</h2>
          <p style="margin: 3px 0 0 0; font-size: 10px; color: #475569;">گزارش کارشناسی رسمی منطق محاسباتی و ضرایب تقویم املاک</p>
        </div>
        <div style="text-align: left; font-size: 10px; color: #334155; line-height: 1.5; direction: rtl;">
          <div><strong>تاریخ صدور:</strong> ${todayDateStr}</div>
          <div><strong>شماره پیگیری:</strong> ${reportId}</div>
        </div>
      </div>

      <!-- Title & Location Details -->
      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; text-align: right;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 13px; font-weight: bold; color: #0f172a;">
            ${formData.title ? formData.title : 'گزارش کارشناسی ارزش معاملاتی ملک'}
          </h3>
          <span style="font-size: 10px; font-weight: bold; color: #b45309; background: #fef3c7; padding: 2px 8px; border-radius: 4px;">
            ${formData.province || 'گیلان'} - ${formData.city || 'رشت'}
          </span>
        </div>
        <div style="margin-top: 6px; font-size: 10px; color: #334155; display: flex; flex-wrap: wrap; gap: 12px;">
          ${formData.blockCode ? `<div>کد بلوک: <strong>${toPersianDigits(formData.blockCode)}</strong></div>` : ''}
          ${formData.partCode ? `<div>قسمت: <strong>${toPersianDigits(formData.partCode)}</strong></div>` : ''}
          ${formData.sectionName ? `<div>معبر/محدوده: <strong>${formData.sectionName}</strong></div>` : ''}
        </div>
        ${formData.address ? `<div style="margin-top: 6px; font-size: 10.5px; color: #1e293b; font-weight: bold;">نشانی دقیق ملک: <span style="font-weight: normal; color: #334155;">${formData.address}</span></div>` : ''}
      </div>

      <!-- SECTION 1: LAND FORMULAS & BREAKDOWN -->
      <div style="border: 1px solid #f59e0b; border-radius: 6px; margin-bottom: 14px; background-color: #ffffff;">
        <div style="background-color: #fef3c7; color: #92400e; padding: 8px 12px; font-size: 12px; font-weight: bold; line-height: 1.8; border-top-left-radius: 5px; border-top-right-radius: 5px; border-bottom: 1px solid #fcd34d;">
          ۱. منطق و فرمول محاسباتی ارزش عرصه (زمین)
        </div>
        <div style="padding: 12px; font-size: 11px; background-color: #ffffff;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 11px; line-height: 1.7;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="color: #64748b; width: 35%; padding: 3px 0;">مساحت زمین:</td>
              <td style="font-weight: bold; text-align: left; padding: 3px 0;">${toPersianDigits(formData.landArea)} متر مربع</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="color: #64748b; padding: 3px 0;">قیمت پایه عرصه بلوک (P):</td>
              <td style="font-weight: bold; text-align: left; padding: 3px 0;">${formatNumberWithCommas(breakdown.land.basePrice)} ریال</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="color: #64748b; padding: 3px 0;">ضریب کاربردی عرصه:</td>
              <td style="font-weight: bold; text-align: left; padding: 3px 0;">${toPersianDigits(breakdown.land.usageCoeff)} <span style="font-size: 10px; color: #64748b;">(${breakdown.land.usageLabel})</span></td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="color: #64748b; padding: 3px 0;">ضریب تعدیل معبر (${toPersianDigits(Math.max(8, formData.streetWidth || 24))}m):</td>
              <td style="font-weight: bold; text-align: left; padding: 3px 0;">${toPersianDigits(breakdown.land.streetWidthCoeff)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="color: #64748b; padding: 3px 0;">ضریب شرایط خاص زمین:</td>
              <td style="font-weight: bold; text-align: left; padding: 3px 0;">${toPersianDigits(breakdown.land.specialConditionCoeff)} <span style="font-size: 10px; color: #64748b;">(${breakdown.land.specialConditionDetail})</span></td>
            </tr>
          </table>

          <div style="background-color: #fffbe2; border: 1px dashed #fde68a; padding: 8px 12px; border-radius: 5px; font-size: 10.5px; color: #78350f; line-height: 1.6;">
            <div><strong>فرمول قیمت موثر عرصه:</strong> ${landEffectiveFormula}</div>
            <div style="margin-top: 4px; color: #b45309; font-weight: bold;"><strong>ارزش کل عرصه:</strong> ${landTotalFormula}</div>
          </div>
        </div>
      </div>

      <!-- SECTION 2: BUILDING FORMULAS & BREAKDOWN -->
      <div style="border: 1px solid #0284c7; border-radius: 6px; margin-bottom: 14px; background-color: #ffffff;">
        <div style="background-color: #e0f2fe; color: #075985; padding: 8px 12px; font-size: 12px; font-weight: bold; line-height: 1.8; border-top-left-radius: 5px; border-top-right-radius: 5px; border-bottom: 1px solid #bae6fd;">
          ۲. منطق و فرمول محاسباتی ارزش اعیانی (ساختمان)
        </div>
        <div style="padding: 12px; font-size: 11px; background-color: #ffffff;">
          ${formData.hasBuilding ? `
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 11px; line-height: 1.7;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="color: #64748b; width: 35%; padding: 3px 0;">مساحت اعیانی (زیربنا):</td>
              <td style="font-weight: bold; text-align: left; padding: 3px 0;">${toPersianDigits(formData.buildingArea)} متر مربع</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="color: #64748b; padding: 3px 0;">نوع سازه و کاربری:</td>
              <td style="font-weight: bold; text-align: left; padding: 3px 0;">${breakdown.building.structureLabel} - ${breakdown.building.usageLabel}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="color: #64748b; padding: 3px 0;">قیمت پایه هر متر سازه:</td>
              <td style="font-weight: bold; text-align: left; padding: 3px 0;">${formatNumberWithCommas(breakdown.building.basePrice)} ریال</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="color: #64748b; padding: 3px 0;">ضریب طبقه (${toPersianDigits(formData.floorNumber || 0)}) و قدمت (${toPersianDigits(formData.buildingAge || 0)} سال):</td>
              <td style="font-weight: bold; text-align: left; padding: 3px 0;">طبقه: ${toPersianDigits(breakdown.building.floorCoeff)} | قدمت: ${toPersianDigits(breakdown.building.ageDiscountCoeff)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="color: #64748b; padding: 3px 0;">مرحله پیشرفت ساخت:</td>
              <td style="font-weight: bold; text-align: left; padding: 3px 0;">${breakdown.building.completionDetail} (ضریب ${toPersianDigits(breakdown.building.completionCoeff)})</td>
            </tr>
            ${formData.isDistressedArea ? `
            <tr style="border-bottom: 1px solid #f1f5f9; background-color: #fef3c7;">
              <td style="color: #92400e; font-weight: bold; padding: 3px 0;">تخفیف بافت فرسوده (بند ۷):</td>
              <td style="font-weight: bold; text-align: left; color: #92400e; padding: 3px 0;">۵۰٪ تخفیف اعمال گردید (ضریب ۰.۵)</td>
            </tr>
            ` : ''}
          </table>

          <div style="background-color: #f0f9ff; border: 1px dashed #bae6fd; padding: 8px 12px; border-radius: 5px; font-size: 10.5px; color: #0369a1; line-height: 1.6;">
            <div><strong>فرمول قیمت موثر اعیانی:</strong> ${buildingEffectiveFormula}</div>
            <div style="margin-top: 4px; color: #0284c7; font-weight: bold;"><strong>ارزش کل اعیانی:</strong> ${buildingTotalFormula}</div>
          </div>
          ` : `
          <div style="text-align: center; color: #64748b; padding: 12px; line-height: 1.6;">
            این ملک فاقد اعیانی (ساختمان) می‌باشد و ارزش اعیانی معادل صفر ریال است.
          </div>
          `}
        </div>
      </div>

      <!-- SECTION 3: GRAND TOTAL -->
      <div style="background-color: #fef08a; border: 2px solid #eab308; color: #0f172a; border-radius: 8px; padding: 14px; margin-bottom: 14px; text-align: center;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ca8a04; padding-bottom: 8px; margin-bottom: 10px; font-size: 11px; color: #854d0e; font-weight: bold; line-height: 1.6;">
          <span>جمع کل برآورد رسمی ارزش معاملاتی (ماده ۶۴)</span>
          ${formData.isGovernmentHousing ? `<span style="background-color: #dc2626; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-size: 10px;">مشمول ۵۰٪ تخفیف طرح مسکن حمایتی / مهر (بند ۸)</span>` : ''}
        </div>

        <div style="font-size: 22px; font-weight: 900; color: #0f172a; direction: ltr; margin: 0 0 8px 0; line-height: 1.4;">
          ${breakdown.formattedGrandTotalRials}
        </div>
        <div>
          <span style="font-size: 11px; font-weight: 800; color: #1e293b; background-color: #ffffff; border: 1px solid #d97706; padding: 4px 14px; border-radius: 6px; display: inline-block; line-height: 1.6;">
            معادل: ${formatCurrencyInPersianWords(breakdown.grandTotalValue)}
          </span>
        </div>
      </div>

      <!-- ATTACHED IMAGE (IF EXISTS) -->
      ${formData.imageUrl ? `
      <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; margin-bottom: 12px; text-align: center; background-color: #f8fafc;">
        <div style="font-size: 10px; font-weight: bold; color: #475569; margin-bottom: 6px; text-align: right;">پیوست: نقشه کاداستر / کروکی بلوک / تصویر ملک</div>
        <img src="${formData.imageUrl}" crossorigin="anonymous" style="max-height: 180px; max-width: 100%; border-radius: 4px; object-fit: contain; margin: 0 auto; display: block;" />
      </div>` : ''}

      ${formData.notes ? `
      <div style="border: 1px solid #fef3c7; border-radius: 6px; padding: 6px 10px; margin-bottom: 12px; font-size: 9px; background-color: #fffbeb; color: #92400e;">
        <strong>ملاحظات کارشناس:</strong> ${formData.notes}
      </div>` : ''}

      <!-- LEGAL DISCLAIMER & SIGNATURE -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 14px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 9px; color: #475569;">
        <div style="line-height: 1.5;">
          <p style="margin: 0;">* این برآورد بر اساس آئین‌نامه اجرایی و ارزش معاملاتی مصوب کمیسیون تقویم املاک ماده ۶۴ ق.م.م تنظیم شده است.</p>
        </div>
        <div style="text-align: center; min-width: 130px;">
          <div style="margin-bottom: 24px; font-weight: bold;">مهر و امضاء کارشناس</div>
          <div style="border-bottom: 1px dashed #94a3b8; width: 100%;"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    if (document.fonts) {
      await document.fonts.ready;
    }

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
      onclone: (clonedDoc) => {
        // 1. Remove all existing styles and stylesheet links that contain Tailwind v4 oklch rules
        const existingStyles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
        existingStyles.forEach((s) => {
          try {
            s.remove();
          } catch {
            // Ignore if removal fails
          }
        });

        // 2. Clear all classes and inherited computed styles on root/body to avoid dark mode or oklch variables
        clonedDoc.documentElement.className = '';
        clonedDoc.documentElement.style.backgroundColor = '#ffffff';
        clonedDoc.documentElement.style.color = '#0f172a';
        clonedDoc.body.className = '';
        clonedDoc.body.style.backgroundColor = '#ffffff';
        clonedDoc.body.style.color = '#0f172a';

        // 3. Inject safe, clean styling without any oklch color definitions
        const cleanStyle = clonedDoc.createElement('style');
        cleanStyle.textContent = `
          * {
            box-sizing: border-box !important;
            font-family: 'Vazirmatn', 'Vazir', Tahoma, Arial, sans-serif !important;
            color-scheme: light !important;
          }
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        `;
        clonedDoc.head.appendChild(cleanStyle);

        // 4. Adjust container position in cloned DOM
        const clonedContainer = clonedDoc.getElementById('official-pdf-report-container');
        if (clonedContainer) {
          clonedContainer.style.position = 'static';
          clonedContainer.style.left = '0';
          clonedContainer.style.top = '0';
          clonedContainer.style.margin = '0 auto';
          clonedContainer.style.backgroundColor = '#ffffff';
          clonedContainer.style.color = '#0f172a';
        }
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const rawFileName = (formData.title?.trim() || (formData.blockCode ? `ملک_بلوک_${formData.blockCode}` : 'پرونده_ارزش_معاملاتی'))
      .replace(/[/\\?%*:|"<>]/g, '_')
      .trim();
    pdf.save(`${rawFileName}.pdf`);
  } catch (err) {
    console.error('Error rendering PDF canvas:', err);
    alert('خطا در صدور فایل PDF. لطفا مجددا تلاش فرمایید.');
    throw err;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
