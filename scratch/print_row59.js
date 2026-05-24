import XLSX from 'xlsx';

const files = [
  'scratch/posoco_psp_latest_2026.xls',
  'scratch/posoco_psp_latest.xls',
  'scratch/posoco_psp_2025_01_15.xls',
  'scratch/posoco_psp_2024_06_15.xls'
];

for (const file of files) {
  console.log(`\nFile: ${file}`);
  const workbook = XLSX.readFile(file);
  const sheet = workbook.Sheets['MOP_E'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log('Row 58 (index 57):', data[57]);
  console.log('Row 59 (index 58):', data[58]);
  console.log('Row 60 (index 59):', data[59]);
}
