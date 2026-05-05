const ExcelJS = require('exceljs');

const buildWorkbook = async ({ sheetName, columns, rows }) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.columns = columns;
  rows.forEach((row) => worksheet.addRow(row));

  worksheet.getRow(1).font = { bold: true };
  worksheet.columns.forEach((column) => {
    column.width = Math.max(column.header.length + 5, 18);
  });

  return workbook.xlsx.writeBuffer();
};

module.exports = {
  buildWorkbook,
};
