import XLSX from 'xlsx';

function run() {
  const workbook = XLSX.readFile('scratch/posoco_psp_latest.xls');
  const sheet = workbook.Sheets['MOP_E'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  let found = false;
  data.forEach((row, i) => {
    row.forEach((cell, j) => {
      if (typeof cell === 'string' && (cell.toLowerCase().includes('temp') || cell.toLowerCase().includes('degree'))) {
        console.log(`Found match at row ${i + 1}, col ${j + 1}:`, cell);
        found = true;
      }
    });
  });
  if (!found) {
    console.log("No temperature-related fields found in the MOP_E sheet.");
  }
}

run();
