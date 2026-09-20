import ExcelJS from 'exceljs';
import type { GanttChart, GanttTask, Project, CompanySettings } from '../types';

export interface ExportGanttExcelOptions {
  chart: GanttChart;
  project?: Project;
  tasks: GanttTask[];
  previewMode: 'days' | 'weeks';
  companySettings?: CompanySettings | null;
  showCompletion?: boolean;
}

const COLOR_MAP: Record<string, string> = {
  indigo: 'FF6366F1',
  blue: 'FF2563EB',
  sky: 'FF0EA5E9',
  cyan: 'FF06B6D4',
  teal: 'FF14B8A6',
  emerald: 'FF10B981',
  lime: 'FF84CC16',
  amber: 'FFF59E0B',
  orange: 'FFF97316',
  red: 'FFEF4444',
  rose: 'FFF43F5E',
  fuchsia: 'FFD946EF',
  purple: 'FFA855F7',
  violet: 'FF8B5CF6',
  slate: 'FF475569',
};

function getTaskArgb(color?: string): string {
  if (!color) return 'FF6366F1';
  if (COLOR_MAP[color.toLowerCase()]) {
    return COLOR_MAP[color.toLowerCase()];
  }
  if (color.startsWith('#')) {
    let clean = color.replace('#', '').trim();
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    if (clean.length === 6) {
      return 'FF' + clean.toUpperCase();
    }
    if (clean.length === 8) {
      return clean.toUpperCase();
    }
  }
  return 'FF6366F1';
}

function formatDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function exportGanttToExcel({
  chart,
  project,
  tasks,
  previewMode,
  companySettings,
  showCompletion = true,
}: ExportGanttExcelOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = companySettings?.company_name || 'Construx CRM';
  workbook.lastModifiedBy = companySettings?.company_name || 'Construx CRM';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Gantt Schedule', {
    views: [{ showGridLines: true, state: 'frozen', xSplit: 9, ySplit: 6 }],
  });

  // Calculate schedule dates
  const startD = new Date(chart.start_date || new Date());
  const endD = new Date(chart.end_date || new Date());
  if (isNaN(startD.getTime())) startD.setTime(Date.now());
  if (isNaN(endD.getTime()) || endD < startD) {
    endD.setTime(startD.getTime() + 14 * 24 * 60 * 60 * 1000);
  }

  const totalDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  // Generate calendar days
  const daysList: {
    dateStr: string;
    dayNum: number;
    dayInitial: string;
    isWeekend: boolean;
    monthYear: string;
  }[] = [];

  const dayInitials = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startD);
    d.setDate(startD.getDate() + i);
    const dayOfWeek = d.getDay();
    daysList.push({
      dateStr: formatDateStr(d),
      dayNum: d.getDate(),
      dayInitial: dayInitials[dayOfWeek],
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      monthYear: `${monthNames[d.getMonth()].toUpperCase()} ${d.getFullYear()}`,
    });
  }

  // Weeks list if previewMode === 'weeks'
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
  const weeksList: {
    weekNum: number;
    label: string;
    startDateStr: string;
    endDateStr: string;
  }[] = [];

  for (let w = 0; w < totalWeeks; w++) {
    const wStart = new Date(startD);
    wStart.setDate(startD.getDate() + w * 7);
    const wEnd = new Date(wStart);
    wEnd.setDate(wStart.getDate() + 6);
    if (wEnd > endD) wEnd.setTime(endD.getTime());

    weeksList.push({
      weekNum: w + 1,
      label: `W${w + 1} (${formatDateStr(wStart).slice(5)} - ${formatDateStr(wEnd).slice(5)})`,
      startDateStr: formatDateStr(wStart),
      endDateStr: formatDateStr(wEnd),
    });
  }

  const timelineColCount = previewMode === 'days' ? daysList.length : weeksList.length;

  // -----------------------------------------------------------------
  // 1. PROJECT & COMPANY HEADER SECTION (Rows 1 to 4)
  // -----------------------------------------------------------------
  // Row 1: Company Name
  worksheet.mergeCells('A1:D1');
  const compCell = worksheet.getCell('A1');
  compCell.value = (companySettings?.company_name || 'CONSTRUX CRM').toUpperCase();
  compCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF0F172A' } };

  // Row 2: Chart Title & Project Name
  worksheet.mergeCells('A2:H2');
  const titleCell = worksheet.getCell('A2');
  const projectDisplay = project?.project_name ? `${project.project_name} — ` : '';
  titleCell.value = `${projectDisplay}${chart.title || 'Master Schedule'}`;
  titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1E293B' } };

  // Row 3: Dates & Period Meta
  worksheet.mergeCells('A3:H3');
  const metaCell = worksheet.getCell('A3');
  metaCell.value = `Schedule Period: ${chart.start_date} to ${chart.end_date} (${totalDays} Days)  |  Exported: ${new Date().toLocaleDateString()}`;
  metaCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };

  // Row 4: Spacer row
  worksheet.getRow(4).height = 8;

  // -----------------------------------------------------------------
  // 2. COLUMN DEFINITIONS (Left info columns + timeline columns)
  // -----------------------------------------------------------------
  const columns: Partial<ExcelJS.Column>[] = [
    { key: 'index', width: 5 },
    { key: 'title', width: 28 },
    { key: 'assigned', width: 16 },
    { key: 'priority', width: 11 },
    { key: 'status', width: 13 },
    { key: 'startDate', width: 12 },
    { key: 'endDate', width: 12 },
    { key: 'duration', width: 11 },
    { key: 'progress', width: 13 },
  ];

  if (previewMode === 'days') {
    for (let i = 0; i < daysList.length; i++) {
      columns.push({ key: `day_${i}`, width: 4.8 });
    }
  } else {
    for (let w = 0; w < weeksList.length; w++) {
      columns.push({ key: `week_${w}`, width: 18 });
    }
  }

  worksheet.columns = columns;

  // -----------------------------------------------------------------
  // 3. TABLE HEADER ROWS (Row 5 & Row 6)
  // -----------------------------------------------------------------
  worksheet.getRow(5).height = 20;
  worksheet.getRow(6).height = 22;

  // Left header labels (Row 5 & 6 merged)
  const leftHeaders = [
    { col: 1, label: '#' },
    { col: 2, label: 'Task / Milestone' },
    { col: 3, label: 'Assigned To' },
    { col: 4, label: 'Priority' },
    { col: 5, label: 'Status' },
    { col: 6, label: 'Start Date' },
    { col: 7, label: 'End Date' },
    { col: 8, label: 'Duration' },
    { col: 9, label: 'Completion' },
  ];

  leftHeaders.forEach(({ col, label }) => {
    worksheet.mergeCells(5, col, 6, col);
    const cell = worksheet.getCell(5, col);
    cell.value = label;
    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'center' : 'left', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });

  // Timeline Header: Row 5 (Month / Grouping) & Row 6 (Days / Weeks)
  const timelineStartCol = 10;

  if (previewMode === 'days') {
    // Month grouping in Row 5
    let currentMonth = '';
    let monthStartIdx = 0;
    let monthCount = 0;

    daysList.forEach((d, idx) => {
      if (d.monthYear !== currentMonth) {
        if (currentMonth !== '') {
          const startCol = timelineStartCol + monthStartIdx;
          const endCol = startCol + monthCount - 1;
          if (endCol > startCol) {
            worksheet.mergeCells(5, startCol, 5, endCol);
          }
          const mCell = worksheet.getCell(5, startCol);
          mCell.value = currentMonth;
          mCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E293B' } };
          mCell.alignment = { vertical: 'middle', horizontal: 'center' };
          mCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
          mCell.border = {
            top: { style: 'medium', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          };
        }
        currentMonth = d.monthYear;
        monthStartIdx = idx;
        monthCount = 1;
      } else {
        monthCount++;
      }
    });

    if (currentMonth !== '') {
      const startCol = timelineStartCol + monthStartIdx;
      const endCol = startCol + monthCount - 1;
      if (endCol > startCol) {
        worksheet.mergeCells(5, startCol, 5, endCol);
      }
      const mCell = worksheet.getCell(5, startCol);
      mCell.value = currentMonth;
      mCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E293B' } };
      mCell.alignment = { vertical: 'middle', horizontal: 'center' };
      mCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      mCell.border = {
        top: { style: 'medium', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    }

    // Days in Row 6
    daysList.forEach((d, idx) => {
      const colNum = timelineStartCol + idx;
      const cell = worksheet.getCell(6, colNum);
      cell.value = `${d.dayInitial}\n${d.dayNum}`;
      cell.font = {
        name: 'Calibri',
        size: 8,
        bold: true,
        color: { argb: d.isWeekend ? 'FF94A3B8' : 'FF334155' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: d.isWeekend ? 'FFF1F5F9' : 'FFF8FAFC' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  } else {
    // Weeks Preview Header
    worksheet.mergeCells(5, timelineStartCol, 5, timelineStartCol + weeksList.length - 1);
    const mCell = worksheet.getCell(5, timelineStartCol);
    mCell.value = 'SCHEDULE TIMELINE (WEEKLY VIEW)';
    mCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E293B' } };
    mCell.alignment = { vertical: 'middle', horizontal: 'center' };
    mCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

    weeksList.forEach((w, idx) => {
      const colNum = timelineStartCol + idx;
      const cell = worksheet.getCell(6, colNum);
      cell.value = w.label;
      cell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF334155' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  }

  // -----------------------------------------------------------------
  // 4. TASK ROWS WITH SOLID WHOLE-CELL COLORS INSTEAD OF BARS
  // -----------------------------------------------------------------
  const startRow = 7;

  tasks.forEach((task, tIdx) => {
    const rowNum = startRow + tIdx;
    const row = worksheet.getRow(rowNum);
    row.height = 24;

    const taskArgb = getTaskArgb(task.color);

    // Compute task overall bounds
    let taskStart = '';
    let taskEnd = '';
    let totalProgress = 0;

    const validSegs = (task.segments || []).filter((s) => s.start_date && s.end_date);
    if (validSegs.length > 0) {
      taskStart = validSegs.reduce((min, s) => (!min || s.start_date < min ? s.start_date : min), '');
      taskEnd = validSegs.reduce((max, s) => (!max || s.end_date > max ? s.end_date : max), '');
      totalProgress = Math.round(
        validSegs.reduce((sum, s) => sum + (s.progress ?? 0), 0) / validSegs.length
      );
    }

    let taskDurationDays = 0;
    if (taskStart && taskEnd) {
      const ts = new Date(taskStart).getTime();
      const te = new Date(taskEnd).getTime();
      if (!isNaN(ts) && !isNaN(te) && te >= ts) {
        taskDurationDays = Math.round((te - ts) / (1000 * 60 * 60 * 24)) + 1;
      }
    }

    // Col 1: Index
    const c1 = worksheet.getCell(rowNum, 1);
    c1.value = tIdx + 1;
    c1.alignment = { vertical: 'middle', horizontal: 'center' };
    c1.font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } };

    // Col 2: Task Title
    const c2 = worksheet.getCell(rowNum, 2);
    c2.value = task.title;
    c2.alignment = { vertical: 'middle', horizontal: 'left' };
    c2.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0F172A' } };

    // Col 3: Assigned To
    const c3 = worksheet.getCell(rowNum, 3);
    c3.value = task.assigned_member?.name || task.assigned_to || 'Unassigned';
    c3.alignment = { vertical: 'middle', horizontal: 'left' };
    c3.font = { name: 'Calibri', size: 9, color: { argb: 'FF475569' } };

    // Col 4: Priority
    const c4 = worksheet.getCell(rowNum, 4);
    c4.value = (task.priority || 'medium').toUpperCase();
    c4.alignment = { vertical: 'middle', horizontal: 'center' };
    c4.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF475569' } };

    // Col 5: Status
    const c5 = worksheet.getCell(rowNum, 5);
    c5.value = (task.status || 'pending').replace('_', ' ').toUpperCase();
    c5.alignment = { vertical: 'middle', horizontal: 'center' };
    c5.font = { name: 'Calibri', size: 8, color: { argb: 'FF475569' } };

    // Col 6: Start Date
    const c6 = worksheet.getCell(rowNum, 6);
    c6.value = taskStart || '-';
    c6.alignment = { vertical: 'middle', horizontal: 'center' };
    c6.font = { name: 'Calibri', size: 9, color: { argb: 'FF334155' } };

    // Col 7: End Date
    const c7 = worksheet.getCell(rowNum, 7);
    c7.value = taskEnd || '-';
    c7.alignment = { vertical: 'middle', horizontal: 'center' };
    c7.font = { name: 'Calibri', size: 9, color: { argb: 'FF334155' } };

    // Col 8: Duration
    const c8 = worksheet.getCell(rowNum, 8);
    c8.value = taskDurationDays > 0 ? `${taskDurationDays} d` : '-';
    c8.alignment = { vertical: 'middle', horizontal: 'center' };
    c8.font = { name: 'Calibri', size: 9, color: { argb: 'FF334155' } };

    // Col 9: Completion
    const c9 = worksheet.getCell(rowNum, 9);
    c9.value = showCompletion ? `${totalProgress}%` : '-';
    c9.alignment = { vertical: 'middle', horizontal: 'center' };
    c9.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E293B' } };

    // Apply baseline border & zebra fill for left info columns
    const isEvenRow = tIdx % 2 === 0;
    const baseRowBg = isEvenRow ? 'FFFFFFFF' : 'FFF9FAFB';

    for (let c = 1; c <= 9; c++) {
      const cell = worksheet.getCell(rowNum, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseRowBg } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }

    // -------------------------------------------------------------
    // TIMELINE COLUMNS: WHOLE CELL SOLID COLOR INSTEAD OF BARS!
    // -------------------------------------------------------------
    if (previewMode === 'days') {
      daysList.forEach((d, idx) => {
        const colNum = timelineStartCol + idx;
        const cell = worksheet.getCell(rowNum, colNum);

        // Check if any segment covers this date
        const matchingSeg = validSegs.find(
          (s) => d.dateStr >= s.start_date && d.dateStr <= s.end_date
        );

        if (matchingSeg) {
          // Whole cell solid color fill!
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: taskArgb },
          };

          // Check if this date is the segment start date, and if custom text or progress is to be rendered
          const isSegStart = d.dateStr === matchingSeg.start_date;
          const customText = matchingSeg.bar_label || task.custom_bar_label || '';

          if (isSegStart && customText) {
            cell.value = showCompletion && matchingSeg.progress !== undefined
              ? `${customText} (${matchingSeg.progress}%)`
              : customText;
            cell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else if (isSegStart && showCompletion && matchingSeg.progress !== undefined) {
            cell.value = `${matchingSeg.progress}%`;
            cell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }

          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          };
        } else {
          // Empty cell: Subtle weekend background or clean row fill
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: d.isWeekend ? 'FFF8FAFC' : baseRowBg },
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFF1F5F9' } },
            bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } },
            left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
            right: { style: 'thin', color: { argb: 'FFF1F5F9' } },
          };
        }
      });
    } else {
      // Weekly view: Check if segment overlaps with the week
      weeksList.forEach((w, idx) => {
        const colNum = timelineStartCol + idx;
        const cell = worksheet.getCell(rowNum, colNum);

        const matchingSeg = validSegs.find(
          (s) => s.start_date <= w.endDateStr && s.end_date >= w.startDateStr
        );

        if (matchingSeg) {
          // Whole cell solid color fill!
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: taskArgb },
          };

          const customText = matchingSeg.bar_label || task.custom_bar_label || '';
          if (customText) {
            cell.value = showCompletion && matchingSeg.progress !== undefined
              ? `${customText} (${matchingSeg.progress}%)`
              : customText;
            cell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else if (showCompletion && matchingSeg.progress !== undefined) {
            cell.value = `${matchingSeg.progress}%`;
            cell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }

          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          };
        } else {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: baseRowBg },
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
        }
      });
    }
  });

  // Write and trigger download in browser
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanProject = (project?.project_name || 'Project').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanTitle = (chart.title || 'Schedule').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `${cleanProject}_${cleanTitle}_Gantt.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
