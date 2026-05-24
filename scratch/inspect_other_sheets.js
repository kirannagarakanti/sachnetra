import XLSX from 'xlsx';

function inspectSheet(filePath, sheetName) {
  console.log(`\n======================================`);
  console.log(`Sheet: ${sheetName} in ${filePath}`);
  console.log(`======================================`);
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.log(`Sheet ${sheetName} not found!`);
    return;
  }
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Total Rows: ${data.length}`);
  data.slice(0, 15).forEach((row, i) => {
    console.log(`Row ${i + 1}:`, row.map(v => typeof v === 'string' ? v.trim() : v));
  });
}

inspectSheet('scratch/posoco_psp_latest.xls', 'TimeSeries');
inspectSheet('scratch/posoco_psp_latest.xls', 'CrossBorder');
inspectSheet('scratch/posoco_psp_latest.xls', 'IR-Line');
