import XLSX from 'xlsx';

function inspectFile(filePath) {
  console.log(`\n======================================`);
  console.log(`Inspecting file: ${filePath}`);
  console.log(`======================================`);
  
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['MOP_E'];
  if (!sheet) {
    console.log(`Error: sheet MOP_E not found!`);
    return;
  }
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Date of Reporting / Date of previous day
  let dateRow = data.find(row => row.includes('Date of Reporting:'));
  console.log("Date Row:", dateRow);

  // Find Section C starting row
  let sectionCRowIdx = data.findIndex(row => row.some(cell => typeof cell === 'string' && cell.includes('Power Supply Position in States')));
  console.log(`Section C starts at row index: ${sectionCRowIdx}`);

  if (sectionCRowIdx === -1) {
    console.log("Could not locate Section C");
    return;
  }

  // Print Section C headers
  console.log("Header Row 1 (idx + 1):", data[sectionCRowIdx + 1]);
  console.log("Header Row 2 (idx + 2):", data[sectionCRowIdx + 2]);

  // Find where Section D starts (Transnational Exchanges)
  let sectionDRowIdx = data.findIndex(row => row.some(cell => typeof cell === 'string' && cell.includes('Transnational Exchanges')));
  console.log(`Section D starts at row index: ${sectionDRowIdx}`);

  // List all states found between Section C + 3 and Section D (or empty row before it)
  const states = [];
  const startIdx = sectionCRowIdx + 3;
  const endIdx = sectionDRowIdx !== -1 ? sectionDRowIdx : data.length;

  for (let idx = startIdx; idx < endIdx; idx++) {
    const row = data[idx];
    if (!row || row.length === 0) continue;
    const stateName = row[1];
    if (stateName && typeof stateName === 'string' && stateName.trim() !== '') {
      states.push({
        rowNum: idx + 1,
        region: row[0] ? row[0].trim() : '',
        state: stateName.trim(),
        values: row.slice(2, 9)
      });
    }
  }

  console.log(`Total States/Entities found: ${states.length}`);
  console.log("State List:");
  states.forEach(s => {
    console.log(`  Row ${s.rowNum} | Region: ${s.region.padEnd(5)} | State: ${s.state.padEnd(25)} | Values: ${JSON.stringify(s.values)}`);
  });
}

function run() {
  inspectFile('scratch/posoco_psp_2024_06_15.xls');
  inspectFile('scratch/posoco_psp_2025_01_15.xls');
  inspectFile('scratch/posoco_psp_latest.xls');
}

run();
