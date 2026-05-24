import XLSX from 'xlsx';

function run() {
  const filePath = 'scratch/posoco_psp_latest_2026.xls';
  console.log(`Parsing ${filePath}...`);
  
  const workbook = XLSX.readFile(filePath);
  console.log(`Sheets in workbook:`, workbook.SheetNames);
  
  // Let's print some info about each sheet
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    const rowsCount = range.e.r - range.s.r + 1;
    const colsCount = range.e.c - range.s.c + 1;
    console.log(`Sheet: "${sheetName}" | Rows: ${rowsCount} | Cols: ${colsCount}`);
    
    // Convert to JSON and print first 15 rows of the first sheet to see the structure
    if (sheetName === workbook.SheetNames[0]) {
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      console.log(`\nFirst 25 rows of "${sheetName}":`);
      data.slice(0, 25).forEach((row, i) => {
        console.log(`Row ${i + 1}:`, row.map(v => typeof v === 'string' ? v.trim() : v));
      });
    }
  }
}

run();
