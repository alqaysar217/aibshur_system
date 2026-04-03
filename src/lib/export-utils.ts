import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addAmiriFont } from './amiri-font';

// Function to export data to Excel
export const exportToExcel = (data: any[], fileName: string, sheetName: string) => {
  const worksheet = utils.json_to_sheet(data);
  const workbook = utils.book_new();
  
  // Enforce RTL direction for the sheet
  if (!workbook.Workbook) workbook.Workbook = {};
  if (!workbook.Workbook.Views) workbook.Workbook.Views = [];
  if (!workbook.Workbook.Views[0]) workbook.Workbook.Views[0] = {};
  workbook.Workbook.Views[0].RTL = true;
  
  utils.book_append_sheet(workbook, worksheet, sheetName);
  writeFile(workbook, `${fileName}.xlsx`);
};

// Function to export data to PDF
export const exportToPdf = (
    title: string,
    summary: { title: string, value: string }[],
    headers: string[],
    body: (string | number)[][],
) => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
    });

    // Add and set the Arabic font
    addAmiriFont(doc);
    doc.setFont('Amiri', 'normal');
    doc.setR2L(true);

    // Document Title
    doc.setFontSize(18);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

    // Summary Section
    let summaryY = 35;
    doc.setFontSize(12);
    doc.text("ملخص التقرير", doc.internal.pageSize.getWidth() - 20, summaryY, { align: 'right' });
    summaryY += 8;
    summary.forEach(item => {
        const titleText = item.title;
        const valueText = String(item.value);
        
        doc.text(valueText, 20, summaryY, { align: 'left' });
        doc.text(titleText, doc.internal.pageSize.getWidth() - 20, summaryY, { align: 'right' });
        summaryY += 8;
    });

    // Table
    autoTable(doc, {
        startY: summaryY + 5,
        head: [headers],
        body: body,
        theme: 'grid',
        headStyles: {
            font: 'Amiri',
            fontStyle: 'bold',
            halign: 'right',
            fillColor: [22, 163, 74], // Tailwind's green-600
        },
        styles: {
            font: 'Amiri',
            halign: 'right',
            cellPadding: 2,
        },
        didParseCell: (data) => {
            if (data.cell.section === 'body' || data.cell.section === 'head') {
                 data.cell.styles.font = 'Amiri';
                 data.cell.styles.halign = 'right';
            }
        }
    });

    doc.save(`${title.replace(/ /g, '_')}.pdf`);
};
