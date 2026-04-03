import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addAmiriFont } from './amiri-font'; // Import the new function

// Function to export data to Excel
export const exportToExcel = (data: any[], fileName: string, sheetName: string) => {
  const worksheet = utils.json_to_sheet(data);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, sheetName);
  writeFile(workbook, `${fileName}.xlsx`);
};

// Function to export data to PDF
export const exportToPdf = (
  title: string,
  headers: string[],
  data: any[][],
  kpiData: { label: string; value: string }[],
  dateRange: string
) => {
  const doc = new jsPDF();

  // Add the Amiri font to the document, which is required for Arabic text.
  addAmiriFont(doc);
  doc.setFont('Amiri', 'normal');

  // Helper to reverse text for proper RTL rendering in jsPDF
  const rtl = (text: string) => text.split('').reverse().join('');

  // Title
  doc.setFontSize(20);
  doc.text(rtl(title), 105, 22, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(rtl(`الفترة: ${dateRange}`), 105, 30, { align: 'center' });

  // KPIs
  let kpiY = 45;
  doc.setFontSize(12);
  kpiData.forEach(kpi => {
    const text = `${rtl(kpi.label)}: ${kpi.value}`;
    doc.text(text, 200, kpiY, { align: 'right' });
    kpiY += 8;
  });

  // Table
  autoTable(doc, {
    startY: kpiY + 5,
    head: [headers.map(h => rtl(h))], // Reverse headers for RTL
    body: data.map(row => row.map(cell => rtl(String(cell)))), // Reverse each cell for RTL
    theme: 'grid',
    styles: {
      font: 'Amiri', // Use the embedded Arabic font
      halign: 'right', // Align all text to the right for RTL
    },
    headStyles: {
      halign: 'center',
      fillColor: [31, 60, 136], // Primary color #1F3C88
      font: 'Amiri',
    }
  });

  doc.save(`${title.replace(/ /g, '_')}.pdf`);
};
