import XLSX from 'xlsx';

const files = [
  'scratch/posoco_psp_latest_2026.xls',
  'scratch/posoco_psp_latest.xls',
  'scratch/posoco_psp_2025_01_15.xls',
  'scratch/posoco_psp_2024_06_15.xls'
];

for (const file of files) {
  console.log(`\n======================================`);
  console.log(`File: ${file}`);
  console.log(`======================================`);
  const workbook = XLSX.readFile(file);
  const sheet = workbook.Sheets['MOP_E'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('Row 1:', data[0]);
  console.log('Row 2:', data[1]);
  console.log('Row 3:', data[2]);
  console.log('Row 4:', data[3]);
  console.log('Row 5:', data[4]);
}
