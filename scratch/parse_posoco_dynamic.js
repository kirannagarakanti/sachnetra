import XLSX from 'xlsx';

// Define the static state-to-region mapping based on our structural analysis
const stateRegionMap = {
  // Northern Region (NR)
  'Punjab': 'NR',
  'Haryana': 'NR',
  'Rajasthan': 'NR',
  'Delhi': 'NR',
  'UP': 'NR',
  'Uttarakhand': 'NR',
  'HP': 'NR',
  'J&K(UT) & Ladakh(UT)': 'NR',
  'Chandigarh': 'NR',
  'Railways_NR ISTS': 'NR',
  // Western Region (WR)
  'Chhattisgarh': 'WR',
  'Gujarat': 'WR',
  'MP': 'WR',
  'Maharashtra': 'WR',
  'Goa': 'WR',
  'DNHDDPDCL': 'WR',
  'AMNSIL': 'WR',
  'BALCO': 'WR',
  'RIL JAMNAGAR': 'WR',
  // Southern Region (SR)
  'Andhra Pradesh': 'SR',
  'Telangana': 'SR',
  'Karnataka': 'SR',
  'Kerala': 'SR',
  'Tamil Nadu': 'SR',
  'Puducherry': 'SR',
  // Eastern Region (ER)
  'Bihar': 'ER',
  'DVC': 'ER',
  'Jharkhand': 'ER',
  'Odisha': 'ER',
  'West Bengal': 'ER',
  'Sikkim': 'ER',
  'Railways_ER ISTS': 'ER',
  // North-Eastern Region (NER)
  'Arunachal Pradesh': 'NER',
  'Assam': 'NER',
  'Manipur': 'NER',
  'Meghalaya': 'NER',
  'Mizoram': 'NER',
  'Nagaland': 'NER',
  'Tripura': 'NER'
};

const files = [
  'scratch/posoco_psp_latest_2026.xls',
  'scratch/posoco_psp_latest.xls',
  'scratch/posoco_psp_2025_01_15.xls',
  'scratch/posoco_psp_2024_06_15.xls'
];

function cleanValue(val) {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'string') {
    const clean = val.trim();
    if (clean === '-' || clean === '') return 0;
    const num = parseFloat(clean);
    if (!isNaN(num) && isFinite(clean)) return num;
    return clean;
  }
  return val;
}

function parseFileDynamic(filePath) {
  console.log(`\n======================================`);
  console.log(`Parsing File (Dynamic): ${filePath}`);
  console.log(`======================================`);
  
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['MOP_E'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // 1. Find Date of Reporting
  let reportingDateStr = null;
  for (let r = 0; r < Math.min(data.length, 10); r++) {
    const row = data[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      if (typeof row[c] === 'string' && row[c].includes('Date of Reporting:')) {
        // Look for the date value in subsequent columns of this row
        for (let nextC = c + 1; nextC < row.length; nextC++) {
          if (row[nextC]) {
            reportingDateStr = row[nextC].toString().trim();
            break;
          }
        }
        break;
      }
    }
    if (reportingDateStr) break;
  }
  
  if (!reportingDateStr) {
    throw new Error(`Could not find Date of Reporting in file: ${filePath}`);
  }
  
  const reportingDate = new Date(reportingDateStr);
  if (isNaN(reportingDate.getTime())) {
    throw new Error(`Invalid reporting date: ${reportingDateStr}`);
  }
  const targetDate = new Date(reportingDate.getTime() - 24 * 60 * 60 * 1000);
  const targetDateFormatted = targetDate.toISOString().split('T')[0];
  
  console.log(`Reporting Date: ${reportingDateStr}`);
  console.log(`Target Date: ${targetDateFormatted}`);
  
  // 2. Find start of Section C
  let startIdx = -1;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row[0] && typeof row[0] === 'string' && row[0].includes('C. Power Supply Position in States')) {
      startIdx = i;
      break;
    }
  }
  
  if (startIdx === -1) {
    throw new Error(`Could not find Section C header in file: ${filePath}`);
  }
  
  console.log(`Section C header found at row ${startIdx + 1}`);
  
  // Data starts 3 rows below the Section C header:
  // Row startIdx: "C. Power Supply Position in States"
  // Row startIdx+1: Header row 1 (Max.Demand, Shortage...)
  // Row startIdx+2: Header row 2 (Region, States, Met during...)
  // Row startIdx+3: First data row (Punjab)
  const dataStartIdx = startIdx + 3;
  const parsedRecords = [];
  
  for (let idx = dataStartIdx; idx < data.length; idx++) {
    const row = data[idx];
    if (!row || row.length === 0) break; // Stop at empty row
    
    // Check if we hit the next section (Section D)
    if (row[0] && typeof row[0] === 'string' && (row[0].startsWith('D. ') || row[0].includes('Transnational Exchanges'))) {
      break;
    }
    
    const stateName = row[1] ? row[1].trim() : null;
    if (!stateName) {
      break; // End of section
    }
    
    const region = stateRegionMap[stateName];
    if (!region) {
      console.log(`Warning: State "${stateName}" not mapped to any region.`);
    }
    
    const maxDemandMetMW = cleanValue(row[2]);
    const shortageMaxDemandMW = cleanValue(row[3]);
    const energyMetMU = cleanValue(row[4]);
    const drawalScheduleMU = cleanValue(row[5]);
    const odUdMU = cleanValue(row[6]);
    const maxOdUdMW = cleanValue(row[7]);
    const energyShortageMU = cleanValue(row[8]);
    
    parsedRecords.push({
      target_date: targetDateFormatted,
      region: region || 'UNKNOWN',
      state_name: stateName,
      max_demand_met_mw: maxDemandMetMW,
      shortage_max_demand_mw: shortageMaxDemandMW,
      energy_met_mu: energyMetMU,
      drawal_schedule_mu: drawalScheduleMU,
      od_ud_mu: odUdMU,
      max_od_ud_mw: maxOdUdMW,
      energy_shortage_mu: energyShortageMU
    });
  }
  
  console.log(`Parsed ${parsedRecords.length} state records dynamically.`);
  console.log(`States parsed:`, parsedRecords.map(r => r.state_name).join(', '));
  
  // Verify composite key uniqueness: (target_date, state_name)
  const keys = parsedRecords.map(r => `${r.target_date}|${r.state_name}`);
  const uniqueKeys = new Set(keys);
  if (uniqueKeys.size !== parsedRecords.length) {
    console.log(`Error: DUPLICATE COMPOSITE KEYS DETECTED!`);
  } else {
    console.log(`Composite key uniqueness verified!`);
  }
}

for (const file of files) {
  parseFileDynamic(file);
}
