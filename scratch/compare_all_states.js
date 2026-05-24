import XLSX from 'xlsx';

function run() {
  const workbook2026 = XLSX.readFile('scratch/posoco_psp_latest_2026.xls');
  const sheet2026 = workbook2026.Sheets['MOP_E'];
  const data2026 = XLSX.utils.sheet_to_json(sheet2026, { header: 1 });
  
  const workbook2025 = XLSX.readFile('scratch/posoco_psp_latest.xls');
  const sheet2025 = workbook2025.Sheets['MOP_E'];
  const data2025 = XLSX.utils.sheet_to_json(sheet2025, { header: 1 });
  
  // Extract states for 2026
  const states2026 = [];
  for (let idx = 20; idx < 60; idx++) {
    const row = data2026[idx];
    if (row && row[1]) {
      states2026.push(row[1].trim());
    }
  }
  
  // Extract states for 2025
  const states2025 = [];
  for (let idx = 20; idx < 60; idx++) {
    const row = data2025[idx];
    if (row && row[1]) {
      states2025.push(row[1].trim());
    }
  }
  
  console.log(`2025 States Count: ${states2025.length} | 2026 States Count: ${states2026.length}`);
  
  let mismatch = false;
  for (let i = 0; i < Math.max(states2025.length, states2026.length); i++) {
    if (states2025[i] !== states2026[i]) {
      console.log(`Mismatch at index ${i}: 2025 = "${states2025[i]}", 2026 = "${states2026[i]}"`);
      mismatch = true;
    }
  }
  if (!mismatch) {
    console.log("State names and sequence are identical between 2025 and 2026 reports!");
  }
}

run();
