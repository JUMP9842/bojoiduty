import { jsPDF } from 'jspdf';
import { ShiftAssignment, User } from '../types';

interface ExportCalendarPdfOptions {
  year: number;
  month: number; // 0-indexed
  shifts: ShiftAssignment[];
  users: User[];
  bathingDates: string[];
}

export const exportCalendarToPdf = ({
  year,
  month,
  shifts,
  users,
  bathingDates,
}: ExportCalendarPdfOptions) => {
  // Create A4 Landscape PDF (297mm x 210mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const marginX = 14;
  const marginY = 12;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthTitle = `${monthNames[month]} ${year}`;

  const hexToRgb = (hex: string): [number, number, number] => {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map((c) => c + c).join('');
    }
    const num = parseInt(cleanHex, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };

  // Header Background Card
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(marginX, marginY, pageWidth - marginX * 2, 18, 2, 2, 'F');
  doc.setDrawColor(220, 224, 230);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, marginY, pageWidth - marginX * 2, 18, 2, 2, 'S');

  // Title: BojoiDuty Calendar
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(24, 24, 27);
  doc.text('BojoiDuty - Dog Care Shift Schedule', marginX + 4, marginY + 11);

  // Month title on the right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(monthTitle, pageWidth - marginX - 4, marginY + 11, { align: 'right' });

  // Calendar Grid Setup
  const gridTop = marginY + 22;
  const gridWidth = pageWidth - marginX * 2;
  const colWidth = gridWidth / 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // Number of weeks in this month
  const totalSlots = firstDayOfWeek + daysInMonth;
  const numWeeks = Math.ceil(totalSlots / 7);
  const headerHeight = 7;
  const availableGridHeight = pageHeight - gridTop - marginY - 14;
  const rowHeight = availableGridHeight / numWeeks;

  // Day Headers (Sun - Sat)
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weekDays.forEach((day, index) => {
    const x = marginX + index * colWidth;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(x, gridTop, colWidth, headerHeight, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    if (index === 0) {
      doc.setTextColor(220, 38, 38); // Sunday Red
    } else if (index === 6) {
      doc.setTextColor(37, 99, 235); // Saturday Blue
    } else {
      doc.setTextColor(51, 65, 85);
    }
    doc.text(day, x + colWidth / 2, gridTop + 5, { align: 'center' });
  });

  const getUser = (id?: string) => users.find((u) => u.id === id);

  // Grid Cells
  let slotIndex = 0;
  for (let week = 0; week < numWeeks; week++) {
    const y = gridTop + headerHeight + week * rowHeight;

    for (let col = 0; col < 7; col++) {
      const x = marginX + col * colWidth;
      const dayNumber = slotIndex - firstDayOfWeek + 1;
      const isValidDay = dayNumber >= 1 && dayNumber <= daysInMonth;

      doc.setFillColor(isValidDay ? 255 : 248, isValidDay ? 255 : 250, isValidDay ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(x, y, colWidth, rowHeight, 'FD');

      if (isValidDay) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
        const dailyShift = shifts.find((s) => s.date === dateStr && s.type === 'daily');
        const bathShift = shifts.find((s) => s.date === dateStr && s.type === 'bathing');
        const hasBathSchedule = bathingDates.includes(dateStr);

        // Day Number
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        if (col === 0) doc.setTextColor(220, 38, 38);
        else if (col === 6) doc.setTextColor(37, 99, 235);
        else doc.setTextColor(30, 41, 59);

        doc.text(String(dayNumber), x + 3, y + 5);

        if (hasBathSchedule) {
          doc.setFontSize(7);
          doc.setTextColor(2, 132, 199);
          doc.text('Bath', x + colWidth - 3, y + 5, { align: 'right' });
        }

        let contentY = y + 7.5;

        // Daily Duty (Morning & Evening)
        if (dailyShift) {
          const morningUser = getUser(dailyShift.morningUserId || dailyShift.userId);
          const eveningUser = getUser(dailyShift.eveningUserId || dailyShift.userId);

          // Morning slot
          if (morningUser) {
            const [r, g, b] = hexToRgb(morningUser.color || '#3B82F6');
            doc.setFillColor(r, g, b);
            doc.circle(x + 3.5, contentY + 2.5, 1.2, 'F');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(30, 41, 59);
            const mText = `AM: ${morningUser.username || morningUser.name}`;
            doc.text(mText.slice(0, 18), x + 6, contentY + 3.5);
          }

          contentY += 5;

          // Evening slot
          if (eveningUser) {
            const [r, g, b] = hexToRgb(eveningUser.color || '#8B5CF6');
            doc.setFillColor(r, g, b);
            doc.circle(x + 3.5, contentY + 2.5, 1.2, 'F');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(30, 41, 59);
            const eText = `PM: ${eveningUser.username || eveningUser.name}`;
            doc.text(eText.slice(0, 18), x + 6, contentY + 3.5);
          }
        }

        // Bathing Duty
        if (bathShift) {
          const bathUser = getUser(bathShift.userId);
          if (bathUser) {
            contentY += 5;
            doc.setFillColor(14, 165, 233);
            doc.roundedRect(x + 2, contentY, colWidth - 4, 4, 1, 1, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(255, 255, 255);
            doc.text(`Bath: ${bathUser.username || bathUser.name}`, x + colWidth / 2, contentY + 3, { align: 'center' });
          }
        }
      }

      slotIndex++;
    }
  }

  // Footer: Member Legends
  const footerY = pageHeight - marginY + 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Members:', marginX, footerY);

  let legendX = marginX + 18;
  users.forEach((u) => {
    const [r, g, b] = hexToRgb(u.color || '#3B82F6');
    doc.setFillColor(r, g, b);
    doc.circle(legendX, footerY - 1, 2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(u.username || u.name, legendX + 4, footerY);

    legendX += (doc.getTextWidth(u.username || u.name) + 12);
  });

  // Save the PDF
  doc.save(`BojoiDuty_Calendar_${year}_${String(month + 1).padStart(2, '0')}.pdf`);
};
