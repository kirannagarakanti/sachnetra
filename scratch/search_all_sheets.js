import XLSX from 'xlsx';

function run() {
  const filePaths = [
    'scratch/posoco_psp_latest_2026.xls',
    'scratch/posoco_psp_latest.xls'
  ];

  for (const filePath of filePaths) {
    console.log(`\nSearching in ${filePath}...`);
    const workbook = XLSX.readFile(filePath);
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      data.forEach((row, i) => {
        row.forEach((cell, j) => {
          if (typeof cell === 'string' && (cell.toLowerCase().includes('temp') || cell.toLowerCase().includes('weather'))) {
            console.log(`Found match in Sheet: ${sheetName} | Row ${i + 1}, Col ${j + 1}: "${cell}"`);
          }
        });
      });
    }
  }
}

run();
