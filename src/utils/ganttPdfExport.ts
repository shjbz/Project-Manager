import { jsPDF } from 'jspdf';
import type { GanttChart, GanttTask, Project, CompanySettings } from '../types';

interface ExportOptions {
  chart: GanttChart;
  project?: Project | null;
  tasks: GanttTask[];
  previewMode: 'days' | 'weeks';
  companySettings?: CompanySettings | null;
}

// Helper to convert hex or named color to RGB
function colorToRgb(color?: string): [number, number, number] {
  if (!color) return [79, 70, 229]; // Indigo
  if (color.startsWith('#')) {
    let c = color.replace('#', '');
    if (c.length === 3) {
      c = c.split('').map((x) => x + x).join('');
    }
    const num = parseInt(c, 16);
    if (!isNaN(num)) {
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }
  }

  const map: Record<string, [number, number, number]> = {
    indigo: [79, 70, 229],
    blue: [37, 99, 235],
    sky: [2, 132, 199],
    cyan: [8, 145, 178],
    teal: [13, 148, 136],
    emerald: [5, 150, 105],
    lime: [101, 163, 13],
    amber: [217, 119, 6],
    orange: [234, 88, 12],
    red: [220, 38, 38],
    rose: [225, 29, 72],
    fuchsia: [192, 38, 211],
    purple: [147, 51, 234],
    violet: [124, 58, 237],
    slate: [71, 85, 105],
  };

  return map[color.toLowerCase()] || [79, 70, 229];
}

// Download blob fallback for iframe environments
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1500);
}

export async function exportGanttToA3Pdf({
  chart,
  project,
  tasks,
  previewMode,
  companySettings,
}: ExportOptions): Promise<void> {
  // A3 Landscape dimensions in mm: 420mm x 297mm
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a3',
  });

  const pageWidth = 420;
  const pageHeight = 297;
  const marginX = 14;
  const marginTop = 14;
  const marginBottom = 12;
  const usableWidth = pageWidth - marginX * 2; // 392 mm
  const usableHeight = pageHeight - marginTop - marginBottom; // 271 mm

  const projectName = project?.project_name || chart.project_name || chart.title || 'Project Schedule';
  const chartTitle = chart.title || projectName;
  const clientName = project?.client?.name || project?.client?.company || 'N/A';
  const companyName = companySettings?.company_name || 'FALCON OPERATIONS & CONSTRUCTION';
  const startDate = chart.start_date;
  const endDate = chart.end_date;

  // Timeline days calculation
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  // Generate days array
  const daysList: Array<{ dateStr: string; dayNum: number; dayInitial: string; isWeekend: boolean; monthYear: string }> = [];
  const initials = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const cur = new Date(start);
  while (cur <= end) {
    const dStr = cur.toISOString().slice(0, 10);
    const dayOfWeek = cur.getDay();
    daysList.push({
      dateStr: dStr,
      dayNum: cur.getDate(),
      dayInitial: initials[dayOfWeek],
      isWeekend: dayOfWeek === 5, // Friday weekend in GCC
      monthYear: cur.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    });
    cur.setDate(cur.getDate() + 1);
  }

  // Weeks list for weeks preview
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

  // -------------------------------------------------------------
  // 1. TOP HEADER BANNER (Native Vector)
  // -------------------------------------------------------------
  let currentY = marginTop;

  // Top company eyebrow
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text(companyName.toUpperCase() + '  •  MASTER PROJECT SCHEDULE', marginX, currentY);

  // Single Page A3 Landscape Badge (Top Right)
  const badgeText = `A3 LANDSCAPE • ${previewMode.toUpperCase()} VIEW`;
  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(pageWidth - marginX - 58, currentY - 4, 58, 7, 1.5, 1.5, 'FD');
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(8);
  pdf.text(badgeText, pageWidth - marginX - 29, currentY + 0.8, { align: 'center' });

  currentY += 7;

  // Main Gantt Title (Prominent)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(15, 23, 42);
  pdf.text(chartTitle, marginX, currentY);

  currentY += 6;

  // Subtitle Metadata Line
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  const metaText = `Project: ${projectName}   |   Client: ${clientName}   |   Timeline: ${startDate} to ${endDate} (${totalDays} Days)   |   Tasks: ${tasks.length}   |   Generated: ${new Date().toLocaleDateString('en-US')}`;
  pdf.text(metaText, marginX, currentY);

  currentY += 4;

  // Divider line
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.4);
  pdf.line(marginX, currentY, marginX + usableWidth, currentY);

  currentY += 4;

  // -------------------------------------------------------------
  // 2. TIMELINE TABLE GEOMETRY
  // -------------------------------------------------------------
  const leftColWidth = 78; // 78 mm for task titles
  const timelineWidth = usableWidth - leftColWidth; // 314 mm for calendar timeline
  const timelineStartX = marginX + leftColWidth;

  const headerHeight = previewMode === 'days' ? 12 : 9;
  const availableTableHeight = usableHeight - (currentY - marginTop) - 8; // Leave 8mm for footer
  const taskCount = Math.max(1, tasks.length);
  // Row height auto scales to fit comfortably on single page
  const rowHeight = Math.min(14, Math.max(7.5, (availableTableHeight - headerHeight) / taskCount));

  // Table Outer Frame Box
  const tableTotalHeight = headerHeight + taskCount * rowHeight;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.3);
  pdf.rect(marginX, currentY, usableWidth, tableTotalHeight, 'S');

  // Header Background
  pdf.setFillColor(248, 250, 252);
  pdf.rect(marginX, currentY, usableWidth, headerHeight, 'F');

  // Left Column Header Text
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Task Title & Milestones', marginX + 4, currentY + headerHeight / 2 + 1.2);

  // Vertical border separating left column from timeline
  pdf.setDrawColor(203, 213, 225);
  pdf.line(timelineStartX, currentY, timelineStartX, currentY + tableTotalHeight);

  // -------------------------------------------------------------
  // 3. CALENDAR HEADER (Days or Weeks)
  // -------------------------------------------------------------
  if (previewMode === 'days') {
    const colWidth = timelineWidth / daysList.length;

    // Month Groups
    let currentMonth = '';
    let monthStartIdx = 0;
    let monthDaysCount = 0;

    daysList.forEach((d, idx) => {
      if (d.monthYear !== currentMonth) {
        if (currentMonth !== '') {
          // Draw previous month group header
          const mStartX = timelineStartX + monthStartIdx * colWidth;
          const mWidth = monthDaysCount * colWidth;
          pdf.setFillColor(241, 245, 249);
          pdf.rect(mStartX, currentY, mWidth, 5.5, 'FD');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7);
          pdf.setTextColor(51, 65, 85);
          pdf.text(currentMonth.toUpperCase(), mStartX + mWidth / 2, currentY + 3.8, { align: 'center' });
        }
        currentMonth = d.monthYear;
        monthStartIdx = idx;
        monthDaysCount = 1;
      } else {
        monthDaysCount++;
      }
    });

    if (currentMonth !== '') {
      const mStartX = timelineStartX + monthStartIdx * colWidth;
      const mWidth = monthDaysCount * colWidth;
      pdf.setFillColor(241, 245, 249);
      pdf.rect(mStartX, currentY, mWidth, 5.5, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(51, 65, 85);
      pdf.text(currentMonth.toUpperCase(), mStartX + mWidth / 2, currentY + 3.8, { align: 'center' });
    }

    // Day Initial & Number Row
    daysList.forEach((d, idx) => {
      const dX = timelineStartX + idx * colWidth;
      if (d.isWeekend) {
        pdf.setFillColor(254, 243, 199); // Soft amber for weekend
        pdf.rect(dX, currentY + 5.5, colWidth, 6.5, 'F');
      }

      pdf.setDrawColor(226, 232, 240);
      pdf.line(dX + colWidth, currentY + 5.5, dX + colWidth, currentY + headerHeight);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(colWidth < 4 ? 4.5 : 6);
      pdf.setTextColor(d.isWeekend ? 180 : 71, d.isWeekend ? 83 : 85, d.isWeekend ? 9 : 105);
      pdf.text(String(d.dayNum), dX + colWidth / 2, currentY + 10.2, { align: 'center' });
    });
  } else {
    // Weeks Preview Header
    const colWidth = timelineWidth / weeksList.length;
    weeksList.forEach((w, idx) => {
      const wX = timelineStartX + idx * colWidth;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(wX + colWidth, currentY, wX + colWidth, currentY + headerHeight);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(15, 23, 42);
      pdf.text(w.label, wX + colWidth / 2, currentY + headerHeight / 2 + 1.2, { align: 'center' });
    });
  }

  // Header bottom border
  pdf.setDrawColor(203, 213, 225);
  pdf.line(marginX, currentY + headerHeight, marginX + usableWidth, currentY + headerHeight);

  currentY += headerHeight;

  // -------------------------------------------------------------
  // 4. TASK ROWS & TIMELINE SEGMENT BARS
  // -------------------------------------------------------------
  tasks.forEach((task, tIdx) => {
    const rowY = currentY + tIdx * rowHeight;
    const isEven = tIdx % 2 === 0;

    // Row Background (Zebra Striping)
    if (!isEven) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(marginX, rowY, usableWidth, rowHeight, 'F');
    }

    // Weekend column shading in background of timeline area
    if (previewMode === 'days') {
      const colWidth = timelineWidth / daysList.length;
      daysList.forEach((d, idx) => {
        if (d.isWeekend) {
          pdf.setFillColor(254, 243, 199, 0.4);
          pdf.rect(timelineStartX + idx * colWidth, rowY, colWidth, rowHeight, 'F');
        }
      });
    }

    // Row bottom divider
    pdf.setDrawColor(226, 232, 240);
    pdf.line(marginX, rowY + rowHeight, marginX + usableWidth, rowY + rowHeight);

    // Left Column: Task Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(rowHeight < 10 ? 7.5 : 8.5);
    pdf.setTextColor(15, 23, 42);

    const safeTitle = task.title.length > 38 ? task.title.substring(0, 36) + '...' : task.title;
    pdf.text(safeTitle, marginX + 3.5, rowY + (task.description ? rowHeight * 0.42 : rowHeight * 0.58));

    if (task.description && rowHeight >= 10) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.setTextColor(148, 163, 184);
      const safeDesc = task.description.length > 44 ? task.description.substring(0, 42) + '...' : task.description;
      pdf.text(safeDesc, marginX + 3.5, rowY + rowHeight * 0.78);
    }

    // Right Column: Segment Bars
    const segments = task.segments || [];
    const [r, g, b] = colorToRgb(task.color);

    segments.forEach((seg) => {
      const segStart = new Date(seg.start_date);
      const segEnd = new Date(seg.end_date);
      if (isNaN(segStart.getTime()) || isNaN(segEnd.getTime())) return;

      const segStartDay = Math.max(0, Math.round((segStart.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      const segDurationDays = Math.max(1, Math.round((segEnd.getTime() - segStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

      let barLeftX = 0;
      let barWidth = 0;

      if (previewMode === 'days') {
        const colWidth = timelineWidth / daysList.length;
        barLeftX = timelineStartX + segStartDay * colWidth;
        barWidth = Math.max(colWidth, segDurationDays * colWidth);
      } else {
        barLeftX = timelineStartX + (segStartDay / 7) * (timelineWidth / totalWeeks);
        barWidth = Math.max(4, (segDurationDays / 7) * (timelineWidth / totalWeeks));
      }

      // Bar Dimensions
      const barPaddingY = Math.max(1.2, rowHeight * 0.16);
      const barHeight = rowHeight - barPaddingY * 2;
      const barY = rowY + barPaddingY;

      // Draw Main Color Bar
      pdf.setFillColor(r, g, b);
      pdf.setDrawColor(Math.max(0, r - 30), Math.max(0, g - 30), Math.max(0, b - 30));
      pdf.setLineWidth(0.2);
      pdf.roundedRect(barLeftX, barY, barWidth, barHeight, 1.2, 1.2, 'FD');

      // Draw Inner Progress Fill
      if (seg.progress > 0) {
        const progressWidth = (barWidth * seg.progress) / 100;
        pdf.setFillColor(Math.max(0, r - 45), Math.max(0, g - 45), Math.max(0, b - 45));
        pdf.roundedRect(barLeftX, barY, progressWidth, barHeight, 1.2, 1.2, 'F');
      }

      // Text inside Bar
      if (barWidth > 14 && barHeight >= 4.5) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(barHeight < 6 ? 5.5 : 6.5);
        pdf.setTextColor(255, 255, 255);
        const barLabel = `${seg.start_date.slice(5)} to ${seg.end_date.slice(5)} (${seg.progress}%)`;
        pdf.text(barLabel, barLeftX + 2, barY + barHeight / 2 + 1);
      }
    });
  });

  // -------------------------------------------------------------
  // 5. FOOTER
  // -------------------------------------------------------------
  const footerY = pageHeight - marginBottom + 3;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(148, 163, 184);
  pdf.text('Falcon Operations Management System • Single Page A3 Landscape Schedule • Confidential', marginX, footerY);
  pdf.text(`Page 1 of 1 • Official Project Document`, pageWidth - marginX, footerY, { align: 'right' });

  // -------------------------------------------------------------
  // 6. SAVE & DOWNLOAD (Direct jsPDF + Blob Fallback)
  // -------------------------------------------------------------
  const safeFilename = (chartTitle || 'project-schedule')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-');
  const filename = `${safeFilename}-gantt-schedule-a3.pdf`;

  try {
    pdf.save(filename);
  } catch (err) {
    console.warn('pdf.save encountered error, falling back to Blob download:', err);
    const pdfBlob = pdf.output('blob');
    downloadBlob(pdfBlob, filename);
  }
}
