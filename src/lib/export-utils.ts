import { utils, writeFile } from 'xlsx';

// Function to export data to Excel
export const exportToExcel = (data: any[], fileName: string, sheetName: string) => {
  const worksheet = utils.json_to_sheet(data);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, sheetName);
  writeFile(workbook, `${fileName}.xlsx`);
};
