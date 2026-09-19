import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { GanttChart, GanttTask, Project, CompanySettings } from '../types';

interface ExportOptions {
  chart: GanttChart;
  project?: Project | null;
  tasks: GanttTask[];
  previewMode: 'days' | 'weeks';
  companySettings?: CompanySettings | null;
}

export async function exportGanttToA3Pdf({
  chart,
  project,
  tasks,
  previewMode,
  companySettings,
}: ExportOptions): Promise<void> {
  // Create an offscreen container specifically styled for A3 Landscape (420mm x 297mm, ratio 1.414)
  // At 96 DPI, A3 Landscape is approx 1587px x 1123px.
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '1587px';
  container.style.minHeight = '1123px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#18181b';
  container.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.padding = '32px 40px';
  container.style.boxSizing = 'border-box';

  const projectName = project?.project_name || chart.project_name || chart.title || 'Project Schedule';
  const clientName = project?.client?.name || project?.client?.company || 'N/A';
  const startDate = chart.start_date;
  const endDate = chart.end_date;

  // Calculate days
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  // Generate days array
  const daysList: Array<{ dateStr: string; dayNum: number; dayInitial: string; isWeekend: boolean }> = [];
  const initials = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const cur = new Date(start);
  while (cur <= end) {
    const dStr = cur.toISOString().slice(0, 10);
    const dayOfWeek = cur.getDay();
    daysList.push({
      dateStr: dStr,
      dayNum: cur.getDate(),
      dayInitial: initials[dayOfWeek],
      isWeekend: dayOfWeek === 5,
    });
    cur.setDate(cur.getDate() + 1);
  }

  // Generate weeks if weeks mode
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
  const weeksList: Array<{ weekNum: number; label: string; startDay: number; endDay: number }> = [];
  for (let w = 0; w < totalWeeks; w++) {
    const sIndex = w * 7;
    const eIndex = Math.min(daysList.length - 1, sIndex + 6);
    const sDate = daysList[sIndex]?.dateStr || '';
    const eDate = daysList[eIndex]?.dateStr || '';
    weeksList.push({
      weekNum: w + 1,
      label: `W${w + 1} (${sDate.slice(5)} - ${eDate.slice(5)})`,
      startDay: sIndex,
      endDay: eIndex,
    });
  }

  // Header HTML
  let html = `
    <div style="border-bottom: 2px solid #e4e4e7; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; margin-bottom: 4px;">
          ${companySettings?.company_name || 'FALCON ENGINEERING & CONSTRUCTION'} &bull; PROJECT SCHEDULE
        </div>
        <h1 style="font-size: 26px; font-weight: 800; color: #09090b; margin: 0 0 6px 0; letter-spacing: -0.02em;">
          ${projectName}
        </h1>
        <div style="display: flex; gap: 16px; font-size: 13px; color: #52525b;">
          <span><strong>Client:</strong> ${clientName}</span>
          <span>&bull;</span>
          <span><strong>Timeline:</strong> ${startDate} to ${endDate} (${totalDays} Days)</span>
          <span>&bull;</span>
          <span><strong>Total Tasks:</strong> ${tasks.length}</span>
        </div>
      </div>
      <div style="text-align: right;">
        <span style="display: inline-block; background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 6px; padding: 4px 10px; font-size: 12px; font-weight: 700; color: #27272a; text-transform: uppercase;">
          Single Page A3 Landscape &bull; ${previewMode.toUpperCase()} VIEW
        </span>
        <div style="font-size: 11px; color: #a1a1aa; margin-top: 6px;">
          Generated on ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}
        </div>
      </div>
    </div>
  `;

  // Grid layout
  const leftColWidth = 320;
  const gridWidth = 1587 - 80 - leftColWidth; // Total width minus padding and left column

  // Column width
  const unitCount = previewMode === 'days' ? daysList.length : weeksList.length;
  const unitColWidth = Math.max(14, gridWidth / unitCount);

  // Table header
  html += `
    <div style="border: 1px solid #d4d4d8; border-radius: 10px; overflow: hidden; background: #ffffff;">
      <div style="display: flex; background: #f8fafc; border-bottom: 1px solid #d4d4d8; font-size: 11px; font-weight: 700; color: #334155;">
        <div style="width: ${leftColWidth}px; padding: 10px 14px; border-right: 1px solid #d4d4d8; box-sizing: border-box;">
          Task Title & Milestone
        </div>
        <div style="flex: 1; display: flex; overflow: hidden;">
  `;

  if (previewMode === 'days') {
    daysList.forEach((d) => {
      html += `
        <div style="width: ${unitColWidth}px; text-align: center; border-right: 1px solid #e2e8f0; padding: 6px 0; background: ${d.isWeekend ? '#fef3c7' : 'transparent'}; box-sizing: border-box;">
          <div style="font-size: 9px; color: #64748b;">${d.dayInitial}</div>
          <div style="font-size: 10px; font-weight: 800; color: #0f172a;">${d.dayNum}</div>
        </div>
      `;
    });
  } else {
    weeksList.forEach((w) => {
      html += `
        <div style="width: ${unitColWidth}px; text-align: center; border-right: 1px solid #e2e8f0; padding: 8px 4px; box-sizing: border-box; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <div style="font-size: 10px; font-weight: 700; color: #0f172a;">${w.label}</div>
        </div>
      `;
    });
  }

  html += `
        </div>
      </div>
  `;

  // Task rows
  tasks.forEach((task, tIndex) => {
    const rowBg = tIndex % 2 === 0 ? '#ffffff' : '#fafafa';
    const segments = task.segments || [];

    html += `
      <div style="display: flex; border-bottom: 1px solid #e4e4e7; background: ${rowBg}; min-height: 48px; align-items: stretch; position: relative;">
        <!-- Left title -->
        <div style="width: ${leftColWidth}px; padding: 10px 14px; border-right: 1px solid #d4d4d8; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center;">
          <div style="font-size: 12px; font-weight: 700; color: #09090b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${task.title}
          </div>
          ${task.description ? `<div style="font-size: 10px; color: #71717a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">${task.description}</div>` : ''}
        </div>
        <!-- Right timeline bar area -->
        <div style="flex: 1; position: relative; display: flex; align-items: center; min-height: 48px;">
    `;

    // Background grid lines
    if (previewMode === 'days') {
      daysList.forEach((d) => {
        html += `
          <div style="width: ${unitColWidth}px; height: 100%; border-right: 1px solid #f1f5f9; background: ${d.isWeekend ? 'rgba(254, 243, 199, 0.3)' : 'transparent'}; box-sizing: border-box;"></div>
        `;
      });
    } else {
      weeksList.forEach(() => {
        html += `
          <div style="width: ${unitColWidth}px; height: 100%; border-right: 1px solid #f1f5f9; box-sizing: border-box;"></div>
        `;
      });
    }

    // Render segment bars
    segments.forEach((seg) => {
      const segStart = new Date(seg.start_date);
      const segEnd = new Date(seg.end_date);
      if (isNaN(segStart.getTime()) || isNaN(segEnd.getTime())) return;

      const segStartDay = Math.max(0, Math.round((segStart.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      const segDurationDays = Math.max(1, Math.round((segEnd.getTime() - segStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

      let leftPx = 0;
      let widthPx = 0;

      if (previewMode === 'days') {
        leftPx = segStartDay * unitColWidth;
        widthPx = Math.max(unitColWidth, segDurationDays * unitColWidth);
      } else {
        leftPx = (segStartDay / 7) * unitColWidth;
        widthPx = Math.max(unitColWidth * 0.5, (segDurationDays / 7) * unitColWidth);
      }

      // Color selection
      const barColor = getBarColorHex(task.color);

      html += `
        <div style="position: absolute; left: ${leftPx}px; width: ${widthPx}px; height: 26px; top: 11px; background: ${barColor}; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); display: flex; align-items: center; justify-content: space-between; padding: 0 8px; box-sizing: border-box; overflow: hidden; color: #ffffff; font-size: 10px; font-weight: 700;">
          <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%;">
            ${seg.start_date.slice(5)} &rarr; ${seg.end_date.slice(5)}
          </span>
          <span>${seg.progress}%</span>
          <!-- Inner progress bar -->
          <div style="position: absolute; left: 0; top: 0; bottom: 0; width: ${seg.progress}%; background: rgba(0,0,0,0.25); z-index: -1;"></div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  html += `
    </div>
    <div style="margin-top: 16px; display: flex; justify-content: space-between; font-size: 11px; color: #71717a;">
      <div>Falcon Management System &bull; Confidential Project Document</div>
      <div>Page 1 of 1 (Single Page A3 Landscape)</div>
    </div>
  `;

  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // Create A3 Landscape PDF: 420mm width x 297mm height
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a3',
    });

    const pdfWidth = 420;
    const pdfHeight = 297;

    // Scale canvas into single A3 page
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    // If height exceeds page height, fit by height
    if (imgHeight > pdfHeight) {
      const fitWidth = (canvas.width * pdfHeight) / canvas.height;
      pdf.addImage(imgData, 'JPEG', (pdfWidth - fitWidth) / 2, 0, fitWidth, pdfHeight);
    } else {
      pdf.addImage(imgData, 'JPEG', 0, Math.max(0, (pdfHeight - imgHeight) / 2), imgWidth, imgHeight);
    }

    const safeTitle = (projectName || 'project-gantt').toLowerCase().replace(/[^a-z0-9]/g, '-');
    pdf.save(`${safeTitle}-gantt-schedule-a3.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

function getBarColorHex(color?: string): string {
  if (!color) return '#4f46e5';
  if (color.startsWith('#')) return color;
  const map: Record<string, string> = {
    indigo: '#4f46e5',
    blue: '#2563eb',
    sky: '#0284c7',
    cyan: '#0891b2',
    teal: '#0d9488',
    emerald: '#059669',
    lime: '#65a30d',
    amber: '#d97706',
    orange: '#ea580c',
    red: '#dc2626',
    rose: '#e11d48',
    fuchsia: '#c026d3',
    purple: '#9333ea',
    violet: '#7c3aed',
    slate: '#475569',
  };
  return map[color] || '#4f46e5';
}
