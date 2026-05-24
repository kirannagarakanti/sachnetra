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
    // Check if it's a number
    const num = parseFloat(clean);
    if (!isNaN(num) && isFinite(clean)) return num;
    return clean; // Return string if not a simple number (like ranges '778/ -819')
  }
  return val;
}

function parseFile(filePath) {
  console.log(`\n======================================`);
  console.log(`Parsing File: ${filePath}`);
  console.log(`======================================`);
  
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['MOP_E'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // 1. Parse Reporting Date & Calculate Target Date
  const reportingDateStr = data[2] && data[2][8];
  if (!reportingDateStr) {
    throw new Error(`Could not find Date of Reporting in Row 3, Col 9 for file: ${filePath}`);
  }
  
  // Format is DD-MMM-YYYY (e.g. 24-May-2026, 16-Jan-2025)
  const reportingDate = new Date(reportingDateStr);
  if (isNaN(reportingDate.getTime())) {
    throw new Error(`Invalid reporting date string: ${reportingDateStr}`);
  }
  
  // Subtract 1 day to get Target Date
  const targetDate = new Date(reportingDate.getTime() - 24 * 60 * 60 * 1000);
  const targetDateFormatted = targetDate.toISOString().split('T')[0];
  
  console.log(`Reporting Date: ${reportingDateStr}`);
  console.log(`Target Date: ${targetDateFormatted}`);
  
  // 2. Parse State rows from row 21 (index 20) to row 59 (index 58)
  const parsedRecords = [];
  for (let idx = 20; idx < 59; idx++) {
    const row = data[idx];
    if (!row) {
      console.log(`Warning: Row at index ${idx} is undefined.`);
      continue;
    }
    
    const stateName = row[1] ? row[1].trim() : null;
    if (!stateName) {
      console.log(`Warning: Row at index ${idx} has no state name in column 2.`);
      continue;
    }
    
    const region = stateRegionMap[stateName];
    if (!region) {
      console.log(`Warning: State "${stateName}" not mapped to any region.`);
    }
    
    // Column mappings based on headers:
    // Col 0: Region (mostly empty, ignore since we use static mapping)
    // Col 1: State name
    // Col 2: Max Demand Met during the day (MW)
    // Col 3: Shortage during maximum Demand (MW)
    // Col 4: Energy Met (MU)
    // Col 5: Drawal Schedule (MU)
    // Col 6: Drawal Actual (MU) or OD(+)/UD(-) (MU) -> wait, let's verify what index 6 is.
    // Let's print out the exact row mapping for first state Punjab:
    // row = [empty, 'Punjab', 13277, 0, 274.72, 158.64, -4.42, '778/ -819', 0.55]
    // Let's verify col names from Row 20 headers:
    // Row 20: [ 'Region', 'States', 'Met during the day (MW)', 'maximum Demand (MW)', '(MU)', 'Schedule (MU)', '(MU)', '(MW)', 'Shortage (MU)' ]
    // Row 19: [ empty, empty, 'Max.Demand', 'Shortage during', 'Energy Met', 'Drawal', 'OD(+)/UD(-)', 'Max', 'Energy' ]
    // Therefore:
    // Index 2: Max Demand Met (MW)
    // Index 3: Shortage during maximum Demand (MW)
    // Index 4: Energy Met (MU)
    // Index 5: Schedule (MU)
    // Index 6: OD(+)/UD(-) (MU)
    // Index 7: Max OD(+)/UD(-) (MW) -> wait, in 2026 this has '778/ -819' (Max OD / Max UD in MW)
    // Index 8: Energy Shortage (MU)
    
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
  
  console.log(`Parsed ${parsedRecords.length} state records.`);
  console.log(`Sample record (Punjab):`, parsedRecords[0]);
  console.log(`Sample record (Meghalaya):`, parsedRecords.find(r => r.state_name === 'Meghalaya'));
  
  // Verify composite key uniqueness: (target_date, state_name)
  const keys = parsedRecords.map(r => `${r.target_date}|${r.state_name}`);
  const uniqueKeys = new Set(keys);
  console.log(`Unique composite keys count: ${uniqueKeys.size} (Expected: ${parsedRecords.length})`);
  if (uniqueKeys.size !== parsedRecords.length) {
    console.log(`Error: DUPLICATE COMPOSITE KEYS DETECTED!`);
  } else {
    console.log(`Composite key uniqueness verified!`);
  }
}

for (const file of files) {
  parseFile(file);
}
