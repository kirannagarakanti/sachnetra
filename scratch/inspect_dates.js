import XLSX from 'xlsx';

function inspectDate(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['MOP_E'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Find row containing "Date of Reporting:"
  const dateRowIdx = data.findIndex(row => row.some(cell => typeof cell === 'string' && cell.includes('Date of Reporting:')));
  if (dateRowIdx !== -1) {
    const row = data[dateRowIdx];
    console.log(`File: ${filePath}`);
    console.log(`  Row ${dateRowIdx + 1}:`, row.map(v => typeof v === 'string' ? v.trim() : v));
  } else {
    console.log(`File: ${filePath} - Date of Reporting not found!`);
  }
}

inspectDate('scratch/posoco_psp_2024_06_15.xls');
inspectDate('scratch/posoco_psp_2025_01_15.xls');
inspectDate('scratch/posoco_psp_latest.xls');
