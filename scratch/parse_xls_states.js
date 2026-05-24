import XLSX from 'xlsx';

function run() {
  const filePath = 'scratch/posoco_psp_latest.xls';
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['MOP_E'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log("Printing State-wise data rows (from row 20 to end):");
  data.slice(19, 101).forEach((row, i) => {
    // Format values nicely
    const cleanRow = row.map(v => {
      if (typeof v === 'string') return v.trim().replace(/\n/g, ' ');
      return v;
    });
    console.log(`Row ${i + 20}:`, cleanRow);
  });
}

run();
