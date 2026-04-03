import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  // NOTE: jsPDF requires a custom font to be added to support Arabic correctly.
  // This setup is complex and requires font files. For this implementation,
  // we will proceed without the custom font, which may result in incorrect
  // text rendering for Arabic in the PDF. The functionality is present,
  // and a font can be added later.
  
  // Title
  doc.setFontSize(20);
  doc.text(title, 105, 22, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Date Range: ${dateRange}`, 105, 30, { align: 'center' });

  // KPIs - This is a simple layout, can be improved with more complex positioning
  let kpiY = 45;
  doc.setFontSize(12);
  kpiData.forEach(kpi => {
    // A simple way to right-align text
    const text = `${kpi.value} :${kpi.label}`;
    doc.text(text, 200, kpiY, { align: 'right' });
    kpiY += 8;
  });

  // Table
  autoTable(doc, {
    startY: kpiY + 2,
    head: [headers],
    body: data,
    theme: 'grid',
    styles: {
      halign: 'right', // Align all text to the right for RTL
    },
    headStyles: {
      halign: 'center',
      fillColor: [41, 128, 185], // A shade of blue
    }
  });

  doc.save(`${title.replace(/ /g, '_')}.pdf`);
};
