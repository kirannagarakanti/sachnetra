import XLSX from 'xlsx';

// Static state-to-region mapping for leaf records
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

function parseFileAllSections(filePath) {
  console.log(`\n======================================`);
  console.log(`Fully Parsing File: ${filePath}`);
  console.log(`======================================`);
  
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['MOP_E'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // 1. Find Date of Reporting & Target Date
  let reportingDateStr = null;
  for (let r = 0; r < Math.min(data.length, 10); r++) {
    const row = data[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      if (typeof row[c] === 'string' && row[c].includes('Date of Reporting:')) {
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
  const targetDate = new Date(reportingDate.getTime() - 24 * 60 * 60 * 1000);
  const targetDateFormatted = targetDate.toISOString().split('T')[0];
  
  const allRecords = [];
  
  // 2. Parse Section A (All India and Regional level)
  // Col headers are: [ Col2: NR, Col3: WR, Col4: SR, Col5: ER, Col6: NER, Col7: TOTAL ]
  const regions = ['NR', 'WR', 'SR', 'ER', 'NER', 'TOTAL'];
  for (let colIdx = 2; colIdx <= 7; colIdx++) {
    const headerName = regions[colIdx - 2];
    const isNational = headerName === 'TOTAL';
    const rowType = isNational ? 'national_total' : 'region_total';
    const entityName = isNational ? 'All India' : headerName;
    
    // Rows:
    // Row 6 (index 5): Demand Met during Evening Peak hrs (MW)
    // Row 7 (index 6): Peak Shortage (MW)
    // Row 8 (index 7): Energy Met (MU)
    // Row 12 (index 11): Energy Shortage (MU)
    // Row 13 (index 12): Maximum Demand Met During the Day (MW)
    
    const peakDemandMetMW = cleanValue(data[5] ? data[5][colIdx] : null);
    const peakShortageMW = cleanValue(data[6] ? data[6][colIdx] : null);
    const energyMetMU = cleanValue(data[7] ? data[7][colIdx] : null);
    const energyShortageMU = cleanValue(data[11] ? data[11][colIdx] : null);
    const maxDemandMetMW = cleanValue(data[12] ? data[12][colIdx] : null);
    
    allRecords.push({
      target_date: targetDateFormatted,
      row_type: rowType,
      region: isNational ? 'All India' : headerName,
      entity_name: entityName,
      max_demand_met_mw: maxDemandMetMW,
      peak_demand_met_mw: peakDemandMetMW,
      peak_demand_shortage_mw: peakShortageMW,
      energy_met_mu: energyMetMU,
      energy_shortage_mu: energyShortageMU,
      drawal_schedule_mu: null,
      od_ud_mu: null,
      max_od_ud_mw: null
    });
  }
  
  // 3. Parse Section C (State-wise details)
  let startIdx = -1;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row[0] && typeof row[0] === 'string' && row[0].includes('C. Power Supply Position in States')) {
      startIdx = i;
      break;
    }
  }
  
  if (startIdx !== -1) {
    const dataStartIdx = startIdx + 3;
    for (let idx = dataStartIdx; idx < data.length; idx++) {
      const row = data[idx];
      if (!row || row.length === 0) break;
      if (row[0] && typeof row[0] === 'string' && (row[0].startsWith('D. ') || row[0].includes('Transnational Exchanges'))) {
        break;
      }
      
      const stateName = row[1] ? row[1].trim() : null;
      if (!stateName) break;
      
      const region = stateRegionMap[stateName] || 'UNKNOWN';
      
      // Index 2: Max Demand Met (MW)
      // Index 3: Shortage during maximum Demand (MW)
      // Index 4: Energy Met (MU)
      // Index 5: Schedule (MU)
      // Index 6: OD(+)/UD(-) (MU)
      // Index 7: Max OD(+)/UD(-) (MW)
      // Index 8: Energy Shortage (MU)
      
      const maxDemandMetMW = cleanValue(row[2]);
      const shortageMaxDemandMW = cleanValue(row[3]);
      const energyMetMU = cleanValue(row[4]);
      const drawalScheduleMU = cleanValue(row[5]);
      const odUdMU = cleanValue(row[6]);
      const maxOdUdMW = cleanValue(row[7]);
      const energyShortageMU = cleanValue(row[8]);
      
      allRecords.push({
        target_date: targetDateFormatted,
        row_type: 'state',
        region: region,
        entity_name: stateName,
        max_demand_met_mw: maxDemandMetMW,
        peak_demand_met_mw: null, // Section C reports Max demand met during day, not evening peak specifically
        peak_demand_shortage_mw: shortageMaxDemandMW,
        energy_met_mu: energyMetMU,
        energy_shortage_mu: energyShortageMU,
        drawal_schedule_mu: drawalScheduleMU,
        od_ud_mu: odUdMU,
        max_od_ud_mw: maxOdUdMW
      });
    }
  }
  
  console.log(`Total records parsed: ${allRecords.length}`);
  
  // Verify composite key uniqueness: (target_date, row_type, entity_name)
  const keys = allRecords.map(r => `${r.target_date}|${r.row_type}|${r.entity_name}`);
  const uniqueKeys = new Set(keys);
  console.log(`Unique keys count: ${uniqueKeys.size} (Expected: ${allRecords.length})`);
  if (uniqueKeys.size !== allRecords.length) {
    console.log(`ERROR: DUPLICATE COMPOSITE KEYS DETECTED!`);
  } else {
    console.log(`Idempotency / Composite key uniqueness verified successfully.`);
  }
  
  // Print some samples
  console.log(`\nSample National Total:`, allRecords.find(r => r.row_type === 'national_total'));
  console.log(`Sample Region Total:`, allRecords.find(r => r.row_type === 'region_total'));
  console.log(`Sample State Record:`, allRecords.find(r => r.row_type === 'state'));
}

const testFiles = [
  'scratch/posoco_psp_latest_2026.xls',
  'scratch/posoco_psp_2023_01_15.xls'
];

for (const file of testFiles) {
  parseFileAllSections(file);
}
