import XLSX from 'xlsx';

function run() {
  const workbook = XLSX.readFile('scratch/posoco_psp_2024_06_15.xls');
  const sheet = workbook.Sheets['MOP_E'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log("Printing rows from 20 to 60 for posoco_psp_2024_06_15.xls:");
  for (let idx = 20; idx <= 60; idx++) {
    const row = data[idx];
    console.log(`Row ${idx + 1}:`, row ? [row[0], row[1]] : 'undefined');
  }
}

run();
